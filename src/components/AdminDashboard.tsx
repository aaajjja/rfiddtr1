"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, onSnapshot, Timestamp, getDocs, query, where } from "firebase/firestore"
import { db } from "../services/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Trash2,
  UserPlus,
  Search,
  Users,
  ClipboardList,
  LogOut,
  Calendar,
  Pencil,
  Download,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "../components/ui/use-toast"
import { registerNewUser, deleteUser, editUser } from "../services/userService"
import { clearAttendanceRecords, exportAttendanceData } from "../services/attendanceManagementService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { format } from "date-fns"
import { resetApplicationState, initializeAppData } from "../services/initializationService"
import { Separator } from "../components/ui/separator"
import { CACHE } from "../services/cacheUtils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { ScrollArea } from "../components/ui/scroll-area"
import { logout } from "../services/authService"

import type { User, TimeRecord } from "../types/index"

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<TimeRecord[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [newUser, setNewUser] = useState({
    name: "",
    cardUID: "",
    department: "",
  })
  const [isResetting, setIsResetting] = useState(false)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([])
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")

  const DEMO_CARD_UIDS = ["12345678", "87654321", "11223344"]

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      await initializeAppData()
      DEMO_CARD_UIDS.forEach((uid) => {
        delete CACHE.users[uid]
      })
      const users = Object.values(CACHE.users).filter((user) => !DEMO_CARD_UIDS.includes(user.cardUID))
      setRegisteredUsers(users)
    }
    loadUsers()
    loadAttendanceRecords()
  }, [refreshKey])

  const loadAttendanceRecords = async () => {
    try {
      setIsProcessing(true)
      const snapshot = await getDocs(collection(db, "attendance"))

      const records = snapshot.docs.map((doc) => {
        const data = doc.data()

        const safeFormatDate = (dateValue: any): { formatted: string; original: Date } => {
          try {
            let date: Date
            if (dateValue?.toDate) {
              date = dateValue.toDate()
            } else if (typeof dateValue === "string") {
              date = new Date(dateValue)
              if (isNaN(date.getTime())) {
                throw new Error("Invalid date")
              }
            } else {
              date = new Date()
            }

            return {
              formatted: format(date, "EEEE, MMMM d, yyyy"),
              original: date,
            }
          } catch {
            const now = new Date()
            return {
              formatted: format(now, "EEEE, MMMM d, yyyy"),
              original: now,
            }
          }
        }

        const safeFormatTime = (timeValue: any): string | undefined => {
          try {
            if (!timeValue) return "-"

            if (timeValue?.toDate) {
              return format(timeValue.toDate(), "hh:mm a")
            }
            if (typeof timeValue === "string") {
              if (/^\d{1,2}:\d{2} [AP]M$/.test(timeValue)) {
                return timeValue
              }
              const parsedDate = new Date(timeValue)
              if (!isNaN(parsedDate.getTime())) {
                return format(parsedDate, "hh:mm a")
              }
            }
            return "-"
          } catch {
            return "-"
          }
        }

        const dateInfo = safeFormatDate(data.date)

        const record: TimeRecord = {
          id: doc.id,
          userId: data.userId || "",
          userName: data.userName || "",
          date: dateInfo.formatted,
          originalDate: dateInfo.original,
          timeInAM: safeFormatTime(data.timeInAM),
          timeOutAM: safeFormatTime(data.timeOutAM),
          timeInPM: safeFormatTime(data.timeInPM),
          timeOutPM: safeFormatTime(data.timeOutPM),
        }

        return record
      })

      setAttendanceRecords(records)
    } catch (error) {
      console.error("Error loading attendance records:", error)
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (selectedMonth !== "all" && attendanceRecords.length > 0) {
      setAttendanceRecords((prev) => [...prev])
    }
  }, [selectedMonth])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUser.name.trim() || !newUser.cardUID.trim()) {
      toast({
        title: "Registration Error",
        description: "Name and Card UID are required fields.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const optimisticId = `user${Date.now()}${Math.floor(Math.random() * 1000)}`
    const optimisticUser: User = {
      id: optimisticId,
      name: newUser.name,
      cardUID: newUser.cardUID,
      department: newUser.department,
    }

    setNewUser({ name: "", cardUID: "", department: "" })

    toast({
      title: "Registering User...",
      description: `User ${optimisticUser.name} is being registered.`,
    })

    registerNewUser(optimisticUser)
      .then(async (result) => {
        if (result.success) {
          CACHE.users[newUser.cardUID] = optimisticUser
          await initializeAppData()
          DEMO_CARD_UIDS.forEach((uid) => {
            delete CACHE.users[uid]
          })
          const users = Object.values(CACHE.users).filter((user) => !DEMO_CARD_UIDS.includes(user.cardUID))
          setRegisteredUsers(users)
          toast({
            title: "User Registered",
            description: `User ${optimisticUser.name} with Card UID ${optimisticUser.cardUID} added successfully!`,
          })
        } else {
          toast({
            title: "Registration Failed",
            description: result.message || "Failed to register user. Please try again.",
            variant: "destructive",
          })
        }
      })
      .catch((error) => {
        toast({
          title: "Registration Error",
          description: error?.message || "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const handleClearRecords = async () => {
    setIsProcessing(true)
    try {
      await clearAttendanceRecords()
      setAttendanceRecords([])
      toast({
        title: "Records Cleared",
        description: "All attendance records have been removed successfully.",
      })
    } catch (error) {
      console.error("Error clearing records:", error)
      toast({
        title: "Error",
        description: "Failed to clear attendance records",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDepartmentChange = (value: string) => {
    setNewUser({ ...newUser, department: value })
  }

  const convertFirestoreRecord = (doc: any): TimeRecord => {
    const data = doc.data()

    const convertTime = (time: any): string | undefined => {
      if (!time) return undefined
      if (time instanceof Timestamp) {
        return format(time.toDate(), "hh:mm a")
      }
      if (typeof time === "string") return time
      return undefined
    }

    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

    return {
      userId: data.userId,
      userName: data.userName,
      date: format(date, "yyyy-MM-dd"),
      originalDate: date,
      timeInAM: convertTime(data.timeInAM),
      timeOutAM: convertTime(data.timeOutAM),
      timeInPM: convertTime(data.timeInPM),
      timeOutPM: convertTime(data.timeOutPM),
    }
  }

  useEffect(() => {
    const usersQuery = query(collection(db, "users"), where("cardUID", "not-in", DEMO_CARD_UIDS))

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]

      setRegisteredUsers(users)
      users.forEach((user) => {
        CACHE.users[user.cardUID] = user
      })
    })

    return () => unsubscribe()
  }, [])

  const handleResetSystem = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the entire system? This will delete all users and attendance records.",
      )
    ) {
      setIsResetting(true)

      try {
        await resetApplicationState()

        setAttendanceRecords([])
        setRegisteredUsers([])

        toast({
          title: "System Reset Complete",
          description: "All users and attendance records have been deleted.",
        })
      } catch (error) {
        console.error("Error resetting system:", error)
        toast({
          title: "Reset Failed",
          description: "There was an error resetting the system.",
          variant: "destructive",
        })
      } finally {
        setIsResetting(false)
      }
    }
  }

  const loadRegisteredUsers = () => {
    const users = Object.values(CACHE.users)
    setRegisteredUsers(users)
  }

  const getAvailableMonths = () => {
    const months = new Map<string, string>()

    attendanceRecords.forEach((record) => {
      if (record.originalDate) {
        const monthKey = format(record.originalDate, "yyyy-MM")
        const monthLabel = format(record.originalDate, "MMMM yyyy")
        months.set(monthKey, monthLabel)
      }
    })

    return Array.from(months.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ value: key, label }))
  }

  const getFilteredRecords = () => {
    let filtered = attendanceRecords

    if (selectedMonth !== "all") {
      filtered = filtered.filter((record) => {
        if (record.originalDate) {
          try {
            const recordMonth = format(record.originalDate, "yyyy-MM")
            return recordMonth === selectedMonth
          } catch (error) {
            console.warn("Error formatting date for record:", record, error)
            return false
          }
        }
        return false
      })
    }

    if (searchTerm) {
      filtered = filtered.filter((record) => {
        return (
          record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.date.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })
    }

    filtered.sort((a, b) => {
      if (!a.originalDate && !b.originalDate) return 0
      if (!a.originalDate) return 1
      if (!b.originalDate) return -1

      return b.originalDate.getTime() - a.originalDate.getTime()
    })

    return filtered
  }

  const getFilteredRecordsStats = () => {
    const filtered = getFilteredRecords()
    const total = attendanceRecords.length

    if (selectedMonth === "all" && !searchTerm) {
      return `Showing all ${total} records`
    }

    const monthText =
      selectedMonth !== "all" ? ` for ${getAvailableMonths().find((m) => m.value === selectedMonth)?.label}` : ""
    const searchText = searchTerm ? ` matching "${searchTerm}"` : ""

    return `Showing ${filtered.length} of ${total} records${monthText}${searchText}`
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
  }

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        const result = await deleteUser(user.id)
        if (result.success) {
          toast({
            title: "User Deleted",
            description: result.message,
          })
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const result = await editUser(editingUser.id, {
        name: editingUser.name,
        cardUID: editingUser.cardUID,
        department: editingUser.department,
      })

      if (result.success) {
        toast({
          title: "User Updated",
          description: result.message,
        })
        setEditingUser(null)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    setTimeout(() => {
      setRefreshKey((prev) => prev + 1)
    }, 0)
  }

  const handleExportData = async () => {
    if (!selectedMonth || selectedMonth === "all") {
      toast({
        title: "Export Failed",
        description: "Please select a specific month to export data",
        variant: "destructive",
      })
      return
    }

    try {
      setIsExporting(true)
      const csvContent = await exportAttendanceData(selectedMonth)
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      
      link.setAttribute("href", url)
      link.setAttribute("download", `attendance_${selectedMonth}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast({
        title: "Export Successful",
        description: `Attendance data for ${getAvailableMonths().find(m => m.value === selectedMonth)?.label} has been downloaded`,
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export attendance data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] px-4 py-6 sm:py-8">
      <div className="container mx-auto max-w-7xl">
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">Admin Dashboard</h1>
                <p className="text-base text-slate-500 mt-1">Manage users and attendance records</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLogout}
                className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border-rose-200 shadow-sm"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
              </Button>
              <Link to="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200 shadow-sm"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Scanner
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-8">
          <TabsList className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            <TabsTrigger
              value="users"
              className="flex-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <Users className="w-5 h-5 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="flex-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
            >
              <ClipboardList className="w-5 h-5 mr-2" />
              Attendance Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-8">
            <Card className="bg-white shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-xl text-slate-800 font-semibold">Register New RFID Card</CardTitle>
                <CardDescription className="text-slate-500">Add a new user to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUser} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-600">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        required
                        className="h-12 bg-white border-slate-200 text-slate-800 text-base placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardUID" className="text-slate-600">
                        Card UID
                      </Label>
                      <Input
                        id="cardUID"
                        value={newUser.cardUID}
                        onChange={(e) => setNewUser({ ...newUser, cardUID: e.target.value })}
                        required
                        className="h-12 bg-white border-slate-200 text-slate-800 text-base placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="department" className="text-slate-600">
                        Department
                      </Label>
                      <Select value={newUser.department} onValueChange={handleDepartmentChange}>
                        <SelectTrigger
                          id="department"
                          className="h-12 bg-white border-slate-200 text-slate-800 text-base focus:border-teal-500 focus:ring-teal-500"
                        >
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CCIS">CCIS</SelectItem>
                          <SelectItem value="COE">COE</SelectItem>
                          <SelectItem value="CAS">CAS</SelectItem>
                          <SelectItem value="CAFSD">CAFSD</SelectItem>
                          <SelectItem value="CHS">CHS</SelectItem>
                          <SelectItem value="CBEA">CBEA</SelectItem>
                          <SelectItem value="COM">COM</SelectItem>
                          <SelectItem value="CVM">CVM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Register New User
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-xl text-slate-800 font-semibold">Registered Users</CardTitle>
                <CardDescription className="text-slate-500">Users currently registered in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-lg border border-slate-100 bg-white">
                  {registeredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500">
                      <Users className="h-12 w-12 mb-4 text-slate-400" />
                      <p>No users registered yet</p>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="grid grid-cols-4 text-sm font-medium text-slate-600 mb-4">
                        <div>Name</div>
                        <div>Card UID</div>
                        <div>Department</div>
                        <div className="text-right">Actions</div>
                      </div>
                      <Separator className="bg-slate-100 mb-4" />
                      <div className="space-y-4">
                        {registeredUsers.map((user) => (
                          <div key={user.cardUID}>
                            {editingUser?.id === user.id ? (
                              <form onSubmit={handleEditUser} className="grid grid-cols-4 gap-2 items-center">
                                <div>
                                  <Input
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Input
                                    value={editingUser.cardUID}
                                    onChange={(e) => setEditingUser({ ...editingUser, cardUID: e.target.value })}
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Select
                                    value={editingUser.department}
                                    onValueChange={(value) => setEditingUser({ ...editingUser, department: value })}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="CCIS">CCIS</SelectItem>
                                      <SelectItem value="COE">COE</SelectItem>
                                      <SelectItem value="CAS">CAS</SelectItem>
                                      <SelectItem value="CAFSD">CAFSD</SelectItem>
                                      <SelectItem value="CHS">CHS</SelectItem>
                                      <SelectItem value="CBEA">CBEA</SelectItem>
                                      <SelectItem value="COM">COM</SelectItem>
                                      <SelectItem value="CVM">CVM</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8 px-2 bg-teal-600 hover:bg-teal-700 text-white"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2"
                                    onClick={() => setEditingUser(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <div className="grid grid-cols-4 text-sm text-slate-700">
                                <div className="truncate font-medium">{user.name}</div>
                                <div className="font-mono text-slate-600">{user.cardUID}</div>
                                <div className="text-slate-600">{user.department || "-"}</div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setEditingUser(user)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                    onClick={() => handleDeleteUser(user)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-xl text-slate-800 font-semibold">System Management</CardTitle>
                <CardDescription className="text-slate-500">Advanced options for system management</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleResetSystem}
                  disabled={isResetting}
                  className="h-12 px-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-sm"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Resetting System...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Reset System
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card className="bg-white shadow-sm border-slate-100">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <CardTitle className="text-xl text-slate-800 font-semibold">Attendance Records</CardTitle>
                    <CardDescription className="text-slate-500 mt-1">
                      View and manage attendance records
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={handleExportData}
                      disabled={isExporting || isProcessing || selectedMonth === "all"}
                      className="h-10 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200 shadow-sm"
                    >
                      {isExporting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      <span className="ml-2 hidden sm:inline">Download</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRefreshKey((prev) => prev + 1)}
                      disabled={isProcessing}
                      className="h-10 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border-slate-200 shadow-sm"
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                      <span className="ml-2 hidden sm:inline">Refresh</span>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleClearRecords}
                      disabled={isProcessing}
                      className="h-10 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-sm"
                    >
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                      <span className="ml-2 hidden sm:inline">Clear Records</span>
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50/50 rounded-xl p-4 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search" className="text-sm font-medium text-slate-600 mb-1.5 block">
                        Search Records
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="search"
                          placeholder="Search by name or date..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-11 bg-white border-slate-200 text-slate-800 text-base placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 w-full"
                        />
                      </div>
                    </div>

                    <div className="md:w-72">
                      <Label htmlFor="month" className="text-sm font-medium text-slate-600 mb-1.5 block">
                        Monthly Report
                      </Label>
                      <Select value={selectedMonth} onValueChange={handleMonthChange}>
                        <SelectTrigger
                          id="month"
                          className="h-11 bg-white border-slate-200 text-slate-800 text-base focus:border-teal-500 focus:ring-teal-500"
                        >
                          <Calendar className="h-5 w-5 mr-2 text-slate-400 flex-shrink-0" />
                          <SelectValue placeholder="All Months" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months</SelectItem>
                          {getAvailableMonths().map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-600">{getFilteredRecordsStats()}</div>
                    {(selectedMonth !== "all" || searchTerm) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMonth("all")
                          setSearchTerm("")
                        }}
                        className="text-slate-500 hover:text-slate-700 h-8 px-3"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
                    <p className="text-slate-600">Loading records...</p>
                  </div>
                ) : getFilteredRecords().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <ClipboardList className="h-12 w-12 mb-4 text-slate-400" />
                    <p className="text-lg font-medium mb-2">No attendance records found</p>
                    <p className="text-sm text-center">
                      {selectedMonth !== "all" || searchTerm
                        ? "Try adjusting your filters or search terms"
                        : "Records will appear here once attendance is logged"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-100 overflow-hidden bg-white">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 hover:bg-slate-100/80">
                            <TableHead className="font-medium text-slate-600">User</TableHead>
                            <TableHead className="font-medium text-slate-600">Date</TableHead>
                            <TableHead className="font-medium text-slate-600">Time In AM</TableHead>
                            <TableHead className="font-medium text-slate-600">Time Out AM</TableHead>
                            <TableHead className="font-medium text-slate-600">Time In PM</TableHead>
                            <TableHead className="font-medium text-slate-600">Time Out PM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredRecords().map((record) => (
                            <TableRow key={`${record.userId}-${record.date}`} className="hover:bg-slate-50">
                              <TableCell className="font-medium text-slate-700">{record.userName}</TableCell>
                              <TableCell className="text-slate-600">{record.date}</TableCell>
                              <TableCell className="text-slate-600 font-mono">{record.timeInAM || "-"}</TableCell>
                              <TableCell className="text-slate-600 font-mono">{record.timeOutAM || "-"}</TableCell>
                              <TableCell className="text-slate-600 font-mono">{record.timeInPM || "-"}</TableCell>
                              <TableCell className="text-slate-600 font-mono">{record.timeOutPM || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminDashboard
