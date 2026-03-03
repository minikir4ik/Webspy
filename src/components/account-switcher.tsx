"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, ChevronsUpDown, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getSavedAccounts,
  saveAccount,
  clearAllAccounts,
  type SavedAccount,
} from "@/lib/account-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AccountSwitcher() {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmail(user.email ?? null);
        setCurrentUserId(user.id);
        saveAccount(user.email ?? "", user.id);
        setAccounts(getSavedAccounts());
      }
    }
    loadUser();
  }, [supabase.auth]);

  const otherAccounts = accounts.filter((a) => a.userId !== currentUserId);
  const initial = currentEmail ? currentEmail[0].toUpperCase() : "?";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleSignOutAll() {
    await supabase.auth.signOut();
    clearAllAccounts();
    router.push("/login");
    router.refresh();
  }

  function handleAddAccount() {
    router.push("/login");
  }

  async function handleSwitchAccount(account: SavedAccount) {
    // Sign out current, redirect to login with hint
    await supabase.auth.signOut();
    router.push(`/login?email=${encodeURIComponent(account.email)}`);
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {initial}
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="truncate text-sm font-medium">
                  {currentEmail ?? "Loading..."}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="w-[--radix-dropdown-menu-trigger-width]"
          >
            {otherAccounts.length > 0 && (
              <>
                {otherAccounts.map((account) => (
                  <DropdownMenuItem
                    key={account.userId}
                    onClick={() => handleSwitchAccount(account)}
                  >
                    <UserCircle className="mr-2 h-4 w-4" />
                    {account.email}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleAddAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
            {otherAccounts.length > 0 && (
              <DropdownMenuItem onClick={handleSignOutAll}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out All
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
