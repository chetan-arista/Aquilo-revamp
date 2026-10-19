"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageTransition } from "./PageTransition";
import { smoothScroll } from "@/lib/scroll";

type Props = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Link that travels: another page plays the curtain transition; same-page anchors glide with
 * smooth scroll; external links behave normally.
 */
export default function TransitionLink({ href, onClick, ...rest }: Props) {
  const pathname = usePathname();
  const { go } = usePageTransition();
  const external = /^(https?:|mailto:|tel:)/.test(href);

  if (external) return <a href={href} onClick={onClick} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />;

  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const [path, hash] = href.split("#");
        const target = path === "" ? pathname : path;
        if (target === pathname) {
          if (hash) { e.preventDefault(); smoothScroll.scrollTo(`#${hash}`, { offset: -10 }); }
          return;
        }
        e.preventDefault();
        go(href);
      }}
    />
  );
}
