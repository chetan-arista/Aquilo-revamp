"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHouseTransition } from "./HouseTransition";
import { houseForPath } from "@/data/houses";
import { smoothScroll } from "@/lib/scroll";

type Props = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Link that travels: crossing into another house plays the house curtain; same-page anchors
 * glide with smooth scroll; external links behave normally.
 */
export default function TransitionLink({ href, onClick, ...rest }: Props) {
  const pathname = usePathname();
  const { go } = useHouseTransition();
  const external = /^(https?:|mailto:|tel:)/.test(href);

  if (external) return <a href={href} onClick={onClick} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />;

  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const [path, hash] = href.split("#");
        if ((path === "" || path === pathname) && hash) {
          e.preventDefault();
          smoothScroll.scrollTo(`#${hash}`, { offset: -10 });
          return;
        }
        if (houseForPath(path).key !== houseForPath(pathname).key) {
          e.preventDefault();
          go(href);
        }
      }}
    />
  );
}
