import { FadeIn } from "@/components/fade-in";
import { ENABLE_LANKSTER_GALLERY_PAGE } from "@/lib/lankster-gallery-flags";
import { ParticlesBackground } from "@/components/particles-background";
import { SiteHeader } from "@/components/site-header";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  consumeLanksterGalleryAuthToken,
  LANKSTER_GALLERY_AUTH_COOKIE,
} from "@/lib/lankster-gallery-auth";

export default async function LanksterGalleryPage() {
  if (!ENABLE_LANKSTER_GALLERY_PAGE) notFound();

  const cookieStore = await cookies();
  const isAuthenticated = await consumeLanksterGalleryAuthToken(
    cookieStore.get(LANKSTER_GALLERY_AUTH_COOKIE)?.value,
  );
  if (!isAuthenticated) redirect("/");

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#030712]">
      <ParticlesBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <SiteHeader title="Lankster Gallery" />
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <FadeIn>
            <div className="mx-auto max-w-lg rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-10 backdrop-blur-md">
              <span className="inline-block rounded-full border border-cyan-500/30 bg-cyan-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
                Lankster Gallery
              </span>
              <h1 className="mt-6 syne-text-safe font-[family-name:var(--font-syne)] text-3xl font-bold leading-[1.45] text-cyan-50 sm:text-4xl">
                In development
              </h1>
            </div>
          </FadeIn>
        </main>
      </div>
    </div>
  );
}
