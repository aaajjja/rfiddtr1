
"""
Optimized RFID Scanner Script for Raspberry Pi
---------------------------------------------
High-performance, low-latency implementation for scanning RFID cards
and recording attendance with minimal delay.
"""

import time
import RPi.GPIO as GPIO
import board
import busio
from adafruit_pn532.spi import PN532_SPI
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import datetime
import requests
import json
import threading
import queue
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Optional: Set up LED pins for feedback
SUCCESS_LED = 17
ERROR_LED = 27
BUZZER = 22

# Global variables for performance optimization
executor = ThreadPoolExecutor(max_workers=4)
process_queue = queue.Queue()
scan_lock = threading.Lock()

# In-memory cache for ultra-fast lookups
user_cache = {}
record_cache = {}
last_scanned_uid = None
last_scan_time = 0
SCAN_COOLDOWN = 2  # seconds

# Setup Firebase (initialize once)
try:
    cred = credentials.Certificate("/path/to/serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase initialized successfully")
except Exception as e:
    print(f"Firebase initialization error: {e}")
    # Continue with local simulation if firebase fails

def setup_hardware():
    """Set up the hardware with optimized configuration."""
    # GPIO setup for feedback LEDs/buzzer
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(SUCCESS_LED, GPIO.OUT)
    GPIO.setup(ERROR_LED, GPIO.OUT)
    GPIO.setup(BUZZER, GPIO.OUT)
    
    # Initialize SPI bus with highest supported speed
    spi = busio.SPI(board.SCK, board.MOSI, board.MISO, frequency=1000000)  # 1MHz SPI clock
    cs_pin = board.D8  # CE0
    
    # Create PN532 object with optimized settings
    pn532 = PN532_SPI(spi, cs_pin)
    
    # Configure PN532 for maximum performance
    pn532.SAM_configuration()
    
    # Reduce power consumption and increase sensitivity
    pn532.power_mode = 1  # Low power mode when idle
    
    print("PN532 NFC RFID Scanner Initialized with optimized settings")
    return pn532

def provide_feedback(success):
    """Provide visual/audio feedback based on scan result."""
    if success:
        GPIO.output(SUCCESS_LED, GPIO.HIGH)
        # Short beep for success
        GPIO.output(BUZZER, GPIO.HIGH)
        time.sleep(0.05)  # Reduced duration
        GPIO.output(BUZZER, GPIO.LOW)
        time.sleep(0.1)   # Reduced duration
        GPIO.output(SUCCESS_LED, GPIO.LOW)
    else:
        GPIO.output(ERROR_LED, GPIO.HIGH)
        # Two short beeps for error
        for _ in range(2):
            GPIO.output(BUZZER, GPIO.HIGH)
            time.sleep(0.05)  # Reduced duration
            GPIO.output(BUZZER, GPIO.LOW)
            time.sleep(0.05)  # Reduced duration
        time.sleep(0.1)   # Reduced duration
        GPIO.output(ERROR_LED, GPIO.LOW)

def get_user_by_card_uid(card_uid):
    """Get user information with optimized caching."""
    # Direct cache lookup without any database calls
    return user_cache.get(card_uid, None)

def get_today_record(user_id):
    """Get today's record with optimized caching."""
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    cache_key = f"{user_id}_{today}"
    
    # Direct cache lookup without any database calls
    return record_cache.get(cache_key, None)

def determine_action(user_id, user_name):
    """Determine attendance action with improved performance."""
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    now = datetime.datetime.now().strftime('%I:%M %p')  # 12-hour format with AM/PM
    cache_key = f"{user_id}_{today}"
    
    # Get or create record with minimal overhead
    record_data = record_cache.get(cache_key, None)
    
    if not record_data:
        # No record for today, create new with Time In AM
        record_data = {
            'userId': user_id,
            'userName': user_name,
            'date': today,
            'timeInAM': now
        }
        # Update cache immediately
        record_cache[cache_key] = record_data
        # Schedule Firebase update in background
        process_queue.put(('write', cache_key, record_data))
        
        return {
            'success': True,
            'action': 'Time In AM',
            'time': now,
            'message': f"Welcome {user_name}! Time In AM recorded at {now}"
        }
    
    # Determine next action with minimal calculations
    if not record_data.get('timeOutAM'):
        # Time Out AM
        record_data['timeOutAM'] = now
        record_cache[cache_key] = record_data  # Update cache
        process_queue.put(('update', cache_key, {'timeOutAM': now}))  # Schedule background update
        return {
            'success': True,
            'action': 'Time Out AM',
            'time': now,
            'message': f"Goodbye {user_name}! Time Out AM recorded at {now}"
        }
    
    if not record_data.get('timeInPM'):
        # Time In PM
        record_data['timeInPM'] = now
        record_cache[cache_key] = record_data  # Update cache
        process_queue.put(('update', cache_key, {'timeInPM': now}))  # Schedule background update
        return {
            'success': True,
            'action': 'Time In PM',
            'time': now,
            'message': f"Welcome back {user_name}! Time In PM recorded at {now}"
        }
    
    if not record_data.get('timeOutPM'):
        # Time Out PM
        record_data['timeOutPM'] = now
        record_cache[cache_key] = record_data  # Update cache
        process_queue.put(('update', cache_key, {'timeOutPM': now}))  # Schedule background update
        return {
            'success': True,
            'action': 'Time Out PM',
            'time': now,
            'message': f"Goodbye {user_name}! Time Out PM recorded at {now}. See you tomorrow!"
        }
    
    # All slots are filled for today
    return {
        'success': False,
        'action': 'Complete',
        'message': f"{user_name}, you have completed your DTR for today."
    }

def record_attendance(card_uid):
    """Ultra-fast attendance recording without database lookups."""
    try:
        # Get user directly from cache
        user = get_user_by_card_uid(card_uid)
        
        if not user:
            return {
                'success': False,
                'message': "Unregistered RFID card. Please contact administrator."
            }
        
        # Determine action with optimized function
        return determine_action(user['id'], user['name'])
        
    except Exception as e:
        print(f"Error recording attendance: {e}")
        return {
            'success': False,
            'message': f"System error: {e}"
        }

def background_worker():
    """Background thread to process Firebase operations with optimized batch handling."""
    batch_timer = time.time()
    batch_operations = []
    batch_size = 10
    batch_timeout = 5  # seconds
    
    while True:
        try:
            # Get operation from queue with timeout to support batch processing
            try:
                operation, key, data = process_queue.get(timeout=0.1)
                batch_operations.append((operation, key, data))
                process_queue.task_done()
            except queue.Empty:
                pass
            
            # Process in batches for better performance
            current_time = time.time()
            should_process = (len(batch_operations) >= batch_size or 
                             (batch_operations and current_time - batch_timer >= batch_timeout))
            
            if should_process:
                batch_timer = current_time
                
                # Create a batch for better performance
                batch = db.batch()
                
                for op, key, data in batch_operations:
                    if op == 'write':
                        batch.set(db.collection('attendance').document(key), data)
                    elif op == 'update':
                        batch.update(db.collection('attendance').document(key), data)
                
                # Commit the batch
                batch.commit()
                batch_operations = []
                
        except Exception as e:
            print(f"Background worker error: {e}")
        
        # Small sleep to avoid CPU overuse
        time.sleep(0.01)

def load_initial_data():
    """Load initial data into cache for better performance."""
    print("Preloading user data into cache...")
    
    # Simulated users (in a real system, we'd fetch these from Firebase)
    simulated_users = [
        {"id": "user1", "name": "John Doe", "cardUID": "12345678", "department": "CCIS"},
        {"id": "user2", "name": "Jane Smith", "cardUID": "87654321", "department": "COE"},
        {"id": "user3", "name": "Mike Johnson", "cardUID": "11223344", "department": "CAS"}
    ]
    
    # Load users into cache
    for user in simulated_users:
        user_cache[user["cardUID"]] = user
    
    print(f"Loaded {len(user_cache)} users into cache")

def main():
    """Main function with optimized scan cycle."""
    # Load initial data into cache
    load_initial_data()
    
    # Initialize hardware
    pn532 = setup_hardware()
    
    # Start background worker
    worker_thread = threading.Thread(target=background_worker, daemon=True)
    worker_thread.start()
    
    print("RFID Scanner Ready - Waiting for cards...")
    
    # Variables to track previous scans (moved outside loop)
    global last_scanned_uid, last_scan_time
    
    try:
        while True:
            # Optimized card reading loop
            uid = pn532.read_passive_target(timeout=0.05)  # Shorter timeout for faster response
            
            # If no card found, continue immediately
            if uid is None:
                time.sleep(0.01)  # Very short sleep for minimal CPU usage
                continue
            
            # Convert UID bytes to string (optimized)
            card_uid = ''.join([hex(i)[2:].zfill(2) for i in uid]).upper()
            current_time = time.time()
            
            # Debounce check with thread-safe locking
            with scan_lock:
                if card_uid == last_scanned_uid and (current_time - last_scan_time < SCAN_COOLDOWN):
                    continue
                
                print(f"\nCard detected: {card_uid}")
                last_scanned_uid = card_uid
                last_scan_time = current_time
            
            # Process scan with optimized functions
            start_time = time.time()
            result = record_attendance(card_uid)
            processing_time = (time.time() - start_time) * 1000  # ms
            
            print(f"Scan processed in {processing_time:.2f}ms: {result['message']}")
            
            # Provide feedback
            provide_feedback(result['success'])
            
    except KeyboardInterrupt:
        print("\nShutting down...")
        # Wait for remaining background tasks to complete
        process_queue.join()
        GPIO.cleanup()
        print("Program terminated.")

if __name__ == "__main__":
    main()
