export default async function Page(props: PageProps<'/owner/password-reset/[token]'>) {
  const { token } = await props.params;

  return (
    <>
      <h1>Owner Password Reset</h1>
      <p>token: {token}</p>
    </>
  );
}
