import { getUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return <DashboardContent user={user} />;
}
