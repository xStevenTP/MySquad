import { getUser } from '@/lib/auth/helpers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
