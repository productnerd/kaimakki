import Link from "next/link";

export default function Footer({ wide }: { wide?: boolean }) {
  return (
    <footer className="bg-brown border-t border-border">
      <div className={`${wide ? "max-w-[100rem]" : "max-w-7xl"} mx-auto px-6 py-12`}>
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <span className="font-display font-black text-lg text-cream">
              Kaimakki
            </span>
            <span className="font-display font-black text-lg text-accent ml-1">
              Studio
            </span>
            <p className="text-sm text-cream-31 mt-2 max-w-xs">
              We edit your videos. You post them. Or we give your money to charity. Your call.
            </p>
          </div>

          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium text-cream-61">Product</h4>
              <Link href="/" className="text-sm text-cream-31 hover:text-cream transition-colors">
                Video Recipes
              </Link>
              <Link href="/pricing" className="text-sm text-cream-31 hover:text-cream transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium text-cream-61">Company</h4>
              <a
                href="https://kaimakki.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cream-31 hover:text-cream transition-colors"
              >
                About
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-cream-20">
          <p className="text-xs text-cream-20">
            &copy; {new Date().getFullYear()} Kaimakki Studio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
