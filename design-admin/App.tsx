import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { Login } from './components/Login';
import { Layout, PageKey } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { WorkItemList } from './components/WorkItemList';
import { ShiftSchedule } from './components/ShiftSchedule';
import { DetailPageChecklist } from './components/DetailPageChecklist';
import { ListingSpecRef } from './components/ListingSpecRef';
import { CareerMap } from './components/CareerMap';
import { KpiSettings } from './components/KpiSettings';
import { MemberManagement } from './components/MemberManagement';

const Shell: React.FC = () => {
  const { currentUser, isManager, selectedMonth } = useApp();
  const [page, setPage] = useState<PageKey>('dashboard');

  if (!currentUser) return <Login />;

  // 主管專屬頁的保護：非主管強制導回 dashboard
  const managerOnly: PageKey[] = ['kpi', 'members'];
  const activePage = managerOnly.includes(page) && !isManager ? 'dashboard' : page;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'work':
        return <WorkItemList />;
      case 'shifts':
        return <ShiftSchedule />;
      case 'checklist':
        return <DetailPageChecklist />;
      case 'specs':
        return <ListingSpecRef />;
      case 'career':
        return <CareerMap />;
      case 'kpi':
        // 以月份當 key，切月時重置表單初始值
        return <KpiSettings key={selectedMonth} />;
      case 'members':
        return <MemberManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout active={activePage} onNavigate={setPage}>
      <div key={activePage} className="animate-fade-in">
        {renderPage()}
      </div>
    </Layout>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppProvider>
      <Shell />
    </AppProvider>
  </ToastProvider>
);

export default App;
