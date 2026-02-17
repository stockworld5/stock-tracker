"use client";

import { Bell, Settings, Search } from "lucide-react";
import SearchCommand from "@/components/SearchCommand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopBar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const letter =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex h-12 items-center px-5 gap-4">

        <Link
          href="/stocks"
          className="text-sm font-semibold tracking-tight text-foreground/90 hover:text-foreground transition-colors whitespace-nowrap"
        >
          Stock<span className="text-primary">Horizon</span>
        </Link>

        <div className="flex flex-1 justify-center">
          <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 hover:border-border transition-colors">
            <Search className="h-4 w-4 opacity-60" />
            <SearchCommand />
            <kbd className="hidden sm:block text-[10px] opacity-50">⌘K</kbd>
          </div>
        </div>

        <div className="flex items-center gap-1">

          <button className="rounded-md p-2 hover:bg-muted/60 transition">
            <Bell className="h-4.5 w-4.5 opacity-80" />
          </button>

          <button
            onClick={() => router.push("/settings")}
            className="rounded-md p-2 hover:bg-muted/60 transition"
          >
            <Settings className="h-4.5 w-4.5 opacity-80" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-7 w-7">
                  {user?.photoURL && <AvatarImage src={user.photoURL} />}
                  <AvatarFallback>{letter}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => signOut(auth)}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );
}
