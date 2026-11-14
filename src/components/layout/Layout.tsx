// src/components/Layout.tsx
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useIsMobile } from '../../hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {isMobile ? (
        <div className="flex flex-col w-full h-full">
          {/* Header com botão de menu */}
          <div className="flex items-center justify-between p-4 shadow-md bg-white z-50">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] p-0">
                <Sidebar />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-gray-700">Painel</h1>
          </div>

          {/* Conteúdo */}
          <main className="flex-1 p-4 overflow-auto">{children}</main>
        </div>
      ) : (
        <>
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </>
      )}
    </div>
  );
};

export default Layout;
