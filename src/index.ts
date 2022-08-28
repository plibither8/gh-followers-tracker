import { markdownv2 as format } from "telegram-format";

interface Env {
  GITHUB_PAT: string;
  TG_BOT_TOKEN: string;
  TG_CHAT_ID: string;
  GH_FOLLOWERS: KVNamespace;
}

interface GqlResponse {
  viewer: {
    followers: {
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
      nodes: {
        login: string;
      }[];
    };
  };
}

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

const FOLLOWERS_QUERY = `
  query($after: String) {
    viewer {
      followers(first: 100, after: $after) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          login
        }
      }
    }
  }
`;

const getFollowers = async (
  env: Env,
  followers: string[] = [],
  after: string | null = null
): Promise<string[]> => {
  const res = await fetch(GITHUB_GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `bearer ${env.GITHUB_PAT}`,
      "User-Agent": "plibither8/gh-followers-tracker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: FOLLOWERS_QUERY,
      variables: { after },
    }),
  });
  const {
    data: {
      viewer: {
        followers: { pageInfo, nodes },
      },
    },
  } = await res.json<{ data: GqlResponse }>();
  followers.push(...nodes.map((n) => n.login));
  return pageInfo.hasNextPage
    ? getFollowers(env, followers, pageInfo.endCursor)
    : followers;
};

const userListFormatter = (users: string[]) =>
  users
    .map(
      (user) =>
        `${format.escape("-")} ${format.url(
          user,
          `https://github.com/${user}`
        )}`
    )
    .join("\n");

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const oldFollowers =
      (await env.GH_FOLLOWERS.get("followers"))?.split(",") ?? [];
    const newFollowers = await getFollowers(env);
    const removed = oldFollowers.filter((f) => !newFollowers.includes(f));
    const added = newFollowers.filter((f) => !oldFollowers.includes(f));
    if (removed.length > 0 || added.length > 0) {
      const text = `${format.bold(
        format.escape("🔔 GitHub followers list updated!")
      )}
${format.escape(`Number of followers: ${341}`)}
${[
  removed.length &&
    `
${format.escape("Unfollowed:")}
${userListFormatter(removed)}`,
  added.length &&
    `
${format.escape("Followed:")}
${userListFormatter(added)}`,
]
  .filter(Boolean)
  .join("\n")}
`;
      await fetch(
        `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: env.TG_CHAT_ID,
            parse_mode: "MarkdownV2",
            disable_web_page_preview: true,
            text,
          }),
        }
      );
      await env.GH_FOLLOWERS.put("followers", newFollowers.join(","));
    }
  },
};
