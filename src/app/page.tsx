import { redirect } from 'next/navigation';

export default function Home() {
  // Staff land on the job board; public customers use /request.
  redirect('/jobs');
}
