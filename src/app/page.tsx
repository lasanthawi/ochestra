import Link from "next/link";
import { Button } from "@/components/ui/button";
import { stackServerApp } from "@/lib/stack/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await stackServerApp.getUser();

  if (user) {
    return redirect("/projects");
  }

  return (
    <div className="flex min-h-dvh min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-background to-muted px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
          Orchestral brain
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:mt-6 sm:text-xl md:text-2xl">
          Fullstack agent
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10 sm:flex-row sm:justify-center sm:gap-6">
          <Button asChild size="lg" className="w-full min-h-12 touch-manipulation sm:w-auto">
            <Link href="/handler/sign-in">Sign in now to get started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
