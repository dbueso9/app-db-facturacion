"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FileText,
  Users,
  Briefcase,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  BarChart2,
} from "lucide-react";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/facturas", label: "Facturas", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicios", label: "Servicios", icon: Briefcase },
  { href: "/reportes", label: "Reportes", icon: BarChart2 },
];

interface NavbarProps {
  username?: string;
  role?: string;
}

export function Navbar({ username, role }: NavbarProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted border border-border overflow-hidden">
              <Image
                src="/Logo DB.png"
                alt="DB Consulting"
                width={28}
                height={28}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-foreground text-sm">
                DB Consulting
              </span>
              <span className="text-muted-foreground text-xs">Facturación</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1 justify-center">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
              {isAdmin ? (
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              ) : (
                <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-foreground capitalize">
                {username ?? "usuario"}
              </span>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
