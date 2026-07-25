"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", fullAccessOnly: false },
  { href: "/admin/departments", label: "Department", fullAccessOnly: true },
  { href: "/admin/trainees", label: "Anak Training", fullAccessOnly: false },
  { href: "/admin/schedules", label: "Jadwal", fullAccessOnly: false },
  { href: "/admin/attendance", label: "Absensi", fullAccessOnly: false },
  { href: "/admin/admins", label: "Kelola Admin", fullAccessOnly: true },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [isFullAccess, setIsFullAccess] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (res.ok) setIsFullAccess(data.role === "full_access");
    }
    loadRole();
  }, []);

  const links = LINKS.filter((link) => !link.fullAccessOnly || isFullAccess);

  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
