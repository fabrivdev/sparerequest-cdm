import { ReactNode } from 'react';
import AppSidebar from '@/components/AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
  userBranch?: string;
}

const AppLayout = ({ children, userBranch }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar userBranch={userBranch} />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
};

export default AppLayout;
