import React, { useState } from "react";
import AnimatedRadio from "@/components/ui/animated-radio";
import { LayoutDashboard, Users, Briefcase } from "lucide-react";

export default function SidebarDemo() {
 const [currentRoute, setCurrentRoute] = useState("/dashboard");

 const sidebarOptions = [
 {
 id: "nav-dashboard",
 value: "/dashboard",
 label: (
 <div className="flex items-center gap-3">
 <LayoutDashboard className="w-5 h-5" />
 <span>Dashboard</span>
 </div>
 ),
 },
 {
 id: "nav-employees",
 value: "/employees",
 label: (
 <div className="flex items-center gap-3">
 <Users className="w-5 h-5" />
 <span>Employees</span>
 </div>
 ),
 },
 {
 id: "nav-recruitment",
 value: "/recruitment",
 label: (
 <div className="flex items-center gap-3">
 <Briefcase className="w-5 h-5" />
 <span>Recruitment</span>
 </div>
 ),
 },
 
 ];

 return (
 <div className="p-8 max-w-sm bg-surface rounded-xl border border-slate-border shadow-sm m-4">
 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6 pl-4">Menu</h3>
 <AnimatedRadio
 options={sidebarOptions}
 value={currentRoute}
 onChange={(val) => setCurrentRoute(val)}
 />
 </div>
 );
}
