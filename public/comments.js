// Update this to your deployed Worker URL, e.g.
// "https://tcb-comments-api.yourname.workers.dev/comments"
// or, once you set up a custom route: "https://comments.tcbexcavation.com/comments"
const API_URL = "https://tcb-comments-api.tcbexcavationllc.workers.dev/comments";

const form = document.getElementById("commentForm");
const nameInput = document.getElementById("commentName");
const textInput = document.getElementById("commentText");
const listEl = document.getElementById("commentList");
const emptyEl = document.getElementById("commentEmpty");
const submitBtn = form.querySelector("button[type=submit]");

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function renderComments(comments) {
  listEl.innerHTML = "";
  emptyEl.style.display = comments.length ? "none" : "block";

  comments.forEach((c) => {
    const card = document.createElement("div");
    card.className = "comment-card";
    // Server already escapes name/text, so this is safe to insert directly.
    card.innerHTML = `
      <div class="comment-card-header">
        <span class="comment-author">${c.name}</span>
        <span class="comment-date">${timeAgo(c.createdAt)}</span>
      </div>
      <p class="comment-text">${c.text}</p>
    `;
    listEl.appendChild(card);
  });
}

async function loadComments() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Failed to load comments");
    const comments = await res.json();
    renderComments(comments);
  } catch (err) {
    console.error(err);
    emptyEl.textContent = "Couldn't load comments right now. Please try again later.";
    emptyEl.classList.add("comments-error");
    emptyEl.style.display = "block";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  if (!name || !text) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Posting...";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text }),
    });

    if (!res.ok) throw new Error("Failed to post comment");

    form.reset();
    await loadComments();
  } catch (err) {
    console.error(err);
    alert("Sorry, something went wrong posting your comment. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Post Comment";
  }
});

loadComments();
