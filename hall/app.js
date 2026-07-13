"use strict";

const loadingState = document.getElementById("loadingState");
const honorGrid = document.getElementById("honorGrid");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");

async function loadHall() {

    try {

        const response = await fetch(
            "../data/history.json?v=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load history.");
        }

        const history = await response.json();

        loadingState.hidden = true;

        if (!Array.isArray(history) || history.length === 0) {
            emptyState.hidden = false;
            return;
        }

        honorGrid.hidden = false;

        history
            .slice()
            .reverse()
            .forEach(member => {

                const card = document.createElement("div");
                card.className = "member-card";

                const highest = member.highest_rating
                    ? `${member.highest_rating.label}: ${member.highest_rating.value}`
                    : "Unrated";

                const featured = member.featured_at
                    ? new Date(member.featured_at).toLocaleDateString()
                    : "";

                card.innerHTML = `
                    <img
                        class="member-avatar"
                        src="${member.avatar || ""}"
                        alt="${member.username}"
                    >

                    <div class="member-name">
                        ${member.title ? member.title + " " : ""}${member.username}
                    </div>

                    <div class="member-rating">
                        ${highest}
                    </div>

                    <div class="member-date">
                        Featured ${featured}
                    </div>

                    <a
                        class="profile-button"
                        href="${member.profile_url}"
                        target="_blank"
                    >
                        View Profile
                    </a>
                `;

                honorGrid.appendChild(card);

            });

    }

    catch (error) {

        console.error(error);

        loadingState.hidden = true;
        errorState.hidden = false;

    }

}

loadHall();
