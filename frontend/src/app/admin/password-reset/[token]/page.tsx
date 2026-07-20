export default async function Page(props: PageProps<'/admin/password-reset/[token]'>) {
  const { token } = await props.params;

  return (
    <>
      <h1>Admin Password Reset</h1>
      <p>token: {token}</p>
    </>
  );
}
