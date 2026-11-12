// Fetches a user's contribution calendar from GitHub's GraphQL API and prints it as JSON.
// Usage: GITHUB_TOKEN=<token> node fetch-calendar.mjs <login> > calendar.json
const [, , login] = process.argv;
const token = process.env.GITHUB_TOKEN;
if (!login || !token) {
  console.error('Usage: GITHUB_TOKEN=<token> node fetch-calendar.mjs <login>');
  process.exit(2);
}

const query = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'skyline-generator' },
  body: JSON.stringify({ query, variables: { login } }),
});
if (!res.ok) {
  console.error(`GitHub API returned ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const json = await res.json();
const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
if (json.errors || !cal?.weeks?.length) {
  console.error('No contribution calendar returned:', JSON.stringify(json.errors ?? json));
  process.exit(1);
}
process.stdout.write(JSON.stringify(json));
