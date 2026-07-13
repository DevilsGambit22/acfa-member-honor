"use strict";

const loadingState = document.getElementById("loadingState");
const memberContent = document.getElementById("memberContent");
const errorState = document.getElementById("errorState");

const memberAvatar = document.getElementById("memberAvatar");
const titleBadge = document.getElementById("titleBadge");
const memberName = document.getElementById("memberName");
const ratingHighlight = document.getElementById("ratingHighlight");
const highestRating = document.getElementById("highestRating");

const rapidRating = document.getElementById("rapidRating");
const blitzRating = document.getElementById("blitzRating");
const bulletRating = document.getElementById("bulletRating");
const dailyRating = document.getElementById("dailyRating");

const joinedAcfa = document.getElementById("joinedAcfa");
const featuredDate = document.getElementById("featuredDate");
const profileButton = document.getElementById("profileButton");

const SPOTLIGHT_DATA_URL = "../data/spotlight.json";

function formatRating(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getAvatarFallback(username) {
  const initial = String(username || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <rect width="100%" height="100%" fill="#11100d"/>
      <circle cx="200" cy="200" r="180" fill="#18150f" stroke="#d6a84b" stroke-width="12"/>
      <text
        x="50%"
        y="54%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="170"
        font-weight="900"
        fill="#f0d38a"
      >${initial}</text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function setAvatar(avatarUrl, username) {
  memberAvatar.alt = `${username} profile picture`;
  memberAvatar.src = avatarUrl || getAvatarFallback(username);

  memberAvatar.onerror = function () {
    memberAvatar.onerror = null;
    memberAvatar.src = getAvatarFallback(username);
  };
}

function renderSpotlight(data) {
  const username = data.username || "ACFA Member";
  const profileUrl =
    data.profile_url ||
    `https://www.chess.com/member/${encodeURIComponent(username)}`;

  setAvatar(data.avatar, username);

  memberName.textContent = username;
  memberName.href = profileUrl;

  profileButton.href = profileUrl;

  if (data.title) {
    titleBadge.textContent = data.title;
    titleBadge.hidden = false;
  } else {
    titleBadge.hidden = true;
  }

  const bestLabel =
    data.highest_rating?.label || "Highest Rating";

  const bestValue =
    data.highest_rating?.value;

  highestRating.textContent = Number.isFinite(bestValue)
    ? `${bestLabel}: ${bestValue.toLocaleString()}`
    : "Unrated";

  ratingHighlight.setAttribute(
    "aria-label",
    highestRating.textContent
  );

  rapidRating.textContent = formatRating(data.rapid);
  blitzRating.textContent = formatRating(data.blitz);
  bulletRating.textContent = formatRating(data.bullet);
  dailyRating.textContent = formatRating(data.daily);

  joinedAcfa.textContent = formatDate(data.joined_acfa);
  featuredDate.textContent = formatDate(data.featured_at);

  loadingState.hidden = true;
  errorState.hidden = true;
  memberContent.hidden = false;
}

function showError(error) {
  console.error("Unable to load Member Spotlight:", error);

  loadingState.hidden = true;
  memberContent.hidden = true;
  errorState.hidden = false;
}

async function loadSpotlight() {
  try {
    const response = await fetch(
      `${SPOTLIGHT_DATA_URL}?v=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Spotlight data request failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data || !data.username) {
      throw new Error(
        "Spotlight data is missing a featured username."
      );
    }

    renderSpotlight(data);
  } catch (error) {
    showError(error);
  }
}

loadSpotlight();
