import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 p-8">
      <h1>Login</h1>

      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="h-10 rounded-md border border-zinc-300 bg-transparent px-3 text-sm dark:border-zinc-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="h-10 rounded-md border border-zinc-300 bg-transparent px-3 text-sm dark:border-zinc-700"
          />
        </div>

        <Button type="submit" variant="default" className="mt-2">
          Login
        </Button>
      </form>
    </div>
  );
}
