import Link from "next/link";

type FooterLinkProps = {
  text: string;
  linkText: string;
  href: string;
};

const FooterLink = ({ text, linkText, href }: FooterLinkProps) => {
  return (
    <div className="pt-1 text-center">
      <p className="text-sm text-slate-500">
        {text}{" "}
        <Link
          href={href}
          className="font-semibold text-blue-700 transition hover:text-blue-800"
        >
          {linkText}
        </Link>
      </p>
    </div>
  );
};

export default FooterLink;