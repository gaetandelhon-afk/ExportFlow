export async function GET() {
  const body = [
    'Contact: mailto:security@exportflow.io',
    'Policy: https://exportflow.io/en/security',
    'Preferred-Languages: en, zh, fr, es, id, tr'
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8'
    }
  });
}

