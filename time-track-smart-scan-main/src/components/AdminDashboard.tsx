import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { registerNewUser } from "../services/userService";
import { getAttendanceRecords, clearAttendanceRecords, reprocessAttendanceData } from "../services/attendanceManagementService";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { resetApplicationState } from "../services/initializationService";
import { clearSimulatedUsers } from "../services/userService";
import { Separator } from "@/components/ui/separator";
import { CACHE } from "../services/cacheUtils";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import types directly from the types folder
import type { User, TimeRecord } from "../types/index"; 