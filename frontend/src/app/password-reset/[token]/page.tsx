export default async function Page(props: PageProps<'/password-reset/[token]'>) {
  const { token } = await props.params;

  return (
    <>
      <h1>Password Reset</h1>
      <p>token: {token}</p>
    </>
  );
}
