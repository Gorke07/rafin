'use client'

import {
  MobileHeader,
  MobileSidebar,
  Sidebar,
  SidebarProvider,
} from '@/components/dashboard/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <MobileHeader />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
        <MobileSidebar />
      </div>
    </SidebarProvider>
  )
}
