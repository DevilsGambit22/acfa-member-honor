"use strict";

const fs = require("fs");
const path = require("path");

const CLUB_SLUG = "and-chess-for-all-official";
const OWNER_USERNAME = "devilsgambit22";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const SPOTLIGHT_FILE = path.join(
  DATA_DIRECTORY,
  "spotlight.json"
);
const HISTORY_FILE = path.join(
  DATA_DIRECTORY,
  "history.json"
);

const USER_AGENT =
  "ACFA-Member-Spotlight/1.0 " +
  "(Chess.com username: DevilsGambit22)";

const RECENT_EXCLUSION_COUNT = 12;
const REQUEST_DELAY_MS = 350;

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText} (${url})`
    );
  }

  return response.json();
}

function ensureDataDirectory() {
  fs.mkdirSync(DATA_DIRECTORY, {
    recursive: true
  });
}

function readJsonFile(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `Could not read ${filePath}. Using fallback data.`,
      error
    );

    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(value, null, 2) + "\n",
    "utf8"
  );
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function getRecentFeaturedUsernames(history) {
  return new Set(
    history
      .slice(-RECENT_EXCLUSION_COUNT)
      .map((entry) =>
        normalizeUsername(entry.username)
      )
  );
}

function getAllClubMembers(clubData) {
  const groups = [
    clubData.weekly,
    clubData.monthly,
    clubData.all_time
  ];

  const membersByUsername = new Map();

  groups.forEach((group) => {
    if (!Array.isArray(group)) {
      return;
    }

    group.forEach((member) => {
      const username = normalizeUsername(
        member.username
      );

      if (!username) {
        return;
      }

      const existing = membersByUsername.get(username);

      if (!existing) {
        membersByUsername.set(username, {
          ...member,
          username
        });

        return;
      }

      const existingJoined =
        Number(existing.joined) || 0;

      const newJoined =
        Number(member.joined) || 0;

      if (newJoined > existingJoined) {
        membersByUsername.set(username, {
          ...existing,
          ...member,
          username
        });
      }
    });
  });

  return Array.from(membersByUsername.values());
}

function chooseRandomMember(members) {
  if (!members.length) {
    throw new Error(
      "No eligible members were available for the spotlight."
    );
  }

  const index = Math.floor(
    Math.random() * members.length
  );

  return members[index];
}

function getRating(stats, category) {
  const rating =
    stats?.[category]?.last?.rating;

  return Number.isFinite(rating)
    ? rating
    : null;
}

function getHighestRating(stats) {
  const ratings = [
    {
      label: "Rapid",
      value: getRating(
        stats,
        "chess_rapid"
      )
    },
    {
      label: "Blitz",
      value: getRating(
        stats,
        "chess_blitz"
      )
    },
    {
      label: "Bullet",
      value: getRating(
        stats,
        "chess_bullet"
      )
    },
    {
      label: "Daily",
      value: getRating(
        stats,
        "chess_daily"
      )
    },
    {
      label: "Chess960",
      value: getRating(
        stats,
        "chess960_daily"
      )
    }
  ].filter((rating) =>
    Number.isFinite(rating.value)
  );

  if (!ratings.length) {
    return {
      label: "Unrated",
      value: null
    };
  }

  return ratings.reduce(
    (highest, current) =>
      current.value > highest.value
        ? current
        : highest
  );
}

function unixToIso(timestamp) {
  const numericTimestamp =
    Number(timestamp);

  if (!Number.isFinite(numericTimestamp)) {
    return null;
  }

  return new Date(
    numericTimestamp * 1000
  ).toISOString();
}

async function main() {
  ensureDataDirectory();

  const history = readJsonFile(
    HISTORY_FILE,
    []
  );

  const clubData = await fetchJson(
    `https://api.chess.com/pub/club/${CLUB_SLUG}/members`
  );

  const allMembers =
    getAllClubMembers(clubData);

  const recentUsernames =
    getRecentFeaturedUsernames(history);

  const eligibleMembers =
    allMembers.filter((member) => {
      const username =
        normalizeUsername(member.username);

      if (!username) {
        return false;
      }

      if (
        username ===
        normalizeUsername(OWNER_USERNAME)
      ) {
        return false;
      }

      if (
        recentUsernames.has(username)
      ) {
        return false;
      }

      return true;
    });

  const selectionPool =
    eligibleMembers.length > 0
      ? eligibleMembers
      : allMembers.filter(
          (member) =>
            normalizeUsername(
              member.username
            ) !==
            normalizeUsername(
              OWNER_USERNAME
            )
        );

  const selectedMember =
    chooseRandomMember(selectionPool);

  await sleep(REQUEST_DELAY_MS);

  const profile = await fetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(
      selectedMember.username
    )}`
  );

  await sleep(REQUEST_DELAY_MS);

  const stats = await fetchJson(
    `https://api.chess.com/pub/player/${encodeURIComponent(
      selectedMember.username
    )}/stats`
  );

  const highestRating =
    getHighestRating(stats);

  const spotlight = {
    username:
      profile.username ||
      selectedMember.username,

    title:
      profile.title || null,

    avatar:
      profile.avatar || null,

    profile_url:
      profile.url ||
      `https://www.chess.com/member/${selectedMember.username}`,

    country_url:
      profile.country || null,

    status:
      profile.status || null,

    joined_chess_com:
      unixToIso(profile.joined),

    joined_acfa:
      unixToIso(selectedMember.joined),

    rapid:
      getRating(
        stats,
        "chess_rapid"
      ),

    blitz:
      getRating(
        stats,
        "chess_blitz"
      ),

    bullet:
      getRating(
        stats,
        "chess_bullet"
      ),

    daily:
      getRating(
        stats,
        "chess_daily"
      ),

    highest_rating: highestRating,

    featured_at:
      new Date().toISOString()
  };

  const historyEntry = {
    username:
      spotlight.username,

    title:
      spotlight.title,

    avatar:
      spotlight.avatar,

    profile_url:
      spotlight.profile_url,

    highest_rating:
      spotlight.highest_rating,

    featured_at:
      spotlight.featured_at
  };

  const updatedHistory = [
    ...history,
    historyEntry
  ];

  writeJsonFile(
    SPOTLIGHT_FILE,
    spotlight
  );

  writeJsonFile(
    HISTORY_FILE,
    updatedHistory
  );

  console.log(
    `Selected ${spotlight.username} as the new ACFA Member Spotlight.`
  );

  console.log(
    `Eligible members considered: ${selectionPool.length}`
  );
}

main().catch((error) => {
  console.error(
    "Spotlight update failed:",
    error
  );

  process.exit(1);
});
