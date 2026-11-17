import { formatSealDate } from "@/components/signing/frame/seal-date";
import { SigningDoneShell } from "@/components/signing/signing-done-shell";

type SignDonePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{
    title?: string | string[];
  }>;
};

export default async function SignDonePage({
  params,
  searchParams,
}: SignDonePageProps) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const envelopeTitle = Array.isArray(resolvedSearchParams?.title)
    ? resolvedSearchParams.title[0]
    : resolvedSearchParams?.title;

  return (
    <SigningDoneShell
      envelopeTitle={envelopeTitle}
      signedOn={formatSealDate(new Date())}
      token={token}
    />
  );
}
