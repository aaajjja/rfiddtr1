
# RFID-Based DTR System Hardware Setup

This document provides instructions for setting up the hardware components of the RFID-based Daily Time Record (DTR) system.

## Components Required

1. Raspberry Pi (Recommended: Raspberry Pi 4 Model B or newer)
2. 13.56MHz RFID/NFC Reader Module (PN532)
3. RFID Cards (MIFARE Classic 1K or compatible)
4. Jumper wires
5. Breadboard (optional, for prototyping)
6. 5V power supply for Raspberry Pi
7. Optional components:
   - Green LED (for success indication)
   - Red LED (for error indication)
   - Buzzer (for audible feedback)
   - 220Ω resistors (for LEDs)
   - Display (Optional: 7" Raspberry Pi Touch Display)

## Wiring Diagram

### PN532 NFC/RFID Reader Connection

The PN532 module can be connected using SPI, I2C, or UART interfaces. This guide uses the SPI interface for better performance.

#### SPI Connection:

| PN532 Pin | Raspberry Pi Pin |
|-----------|------------------|
| VCC       | 3.3V (Pin 1)     |
| GND       | GND (Pin 6)      |
| SCK       | SCLK (Pin 23)    |
| MISO      | MISO (Pin 21)    |
| MOSI      | MOSI (Pin 19)    |
| SS        | CE0 (Pin 24)     |
| IRQ       | Not connected    |
| RSTPDN    | Not connected    |

### Optional Feedback Components

#### LEDs for Status Indication:

| Component | Raspberry Pi Pin |
|-----------|------------------|
| Green LED + resistor | GPIO17 (Pin 11) |
| Red LED + resistor   | GPIO27 (Pin 13) |

#### Buzzer for Audible Feedback:

| Component | Raspberry Pi Pin |
|-----------|------------------|
| Buzzer    | GPIO22 (Pin 15)  |

## Software Setup

1. **Raspberry Pi OS Installation**:
   - Install Raspberry Pi OS (formerly Raspbian) using the Raspberry Pi Imager
   - Enable SSH, I2C, and SPI interfaces using `raspi-config`

2. **Required Python Packages**:
   ```bash
   sudo apt-get update
   sudo apt-get install python3-pip python3-dev
   sudo pip3 install RPi.GPIO adafruit-blinka adafruit-circuitpython-pn532
   sudo pip3 install firebase-admin
   ```

3. **Configure Autostart**:
   To have the RFID scanner script run automatically on boot:
   ```bash
   sudo nano /etc/rc.local
   ```
   Add this line before `exit 0`:
   ```bash
   python3 /path/to/rfid_scanner.py &
   ```

## Testing the Hardware

1. **Test the RFID Reader**:
   Run the test script to ensure the RFID reader is working:
   ```bash
   python3 test_rfid_reader.py
   ```

2. **Testing the Complete System**:
   Run the main script and scan an RFID card:
   ```bash
   python3 rfid_scanner.py
   ```

## Troubleshooting

- **RFID Reader Not Detecting Cards**:
  - Check the wiring connections
  - Ensure SPI is enabled in `raspi-config`
  - Try adjusting the distance between the card and the reader

- **Connection Issues with Firebase**:
  - Check internet connectivity
  - Verify the Firebase service account credentials
  - Ensure the Raspberry Pi's date and time are correct

- **LEDs or Buzzer Not Working**:
  - Check the GPIO pin assignments
  - Verify the resistors are correctly installed for LEDs
  - Check polarity of LEDs

## Enclosure Ideas

For a professional installation:
1. 3D print an enclosure that holds both the Raspberry Pi and the RFID reader
2. Mount the RFID reader on the outer surface for easy scanning
3. Install LEDs so they're visible through the case
4. If using a display, mount it at an angle for better visibility

## Power Considerations

For reliable operation, especially in locations with unreliable power:
1. Use a UPS (Uninterruptible Power Supply) for the Raspberry Pi
2. Consider implementing a safe shutdown mechanism when power is lost
3. Use a high-quality power supply rated at least 2.5A for Raspberry Pi 4

## Maintenance

- Regularly check the physical connections
- Update the software packages periodically
- Back up the Firebase database
- Monitor system logs for any errors or unusual behavior
