script.js // ==========================================
// KONFIGURASI SUPABASE
// ==========================================
const SUPABASE_URL = "https://mwxhqmlfusdzezaebiit.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZcuPqDm7NYat0AZSAJIZtg_RNxuz-4K";
const API = SUPABASE_URL + "/rest/v1";
const HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json"
};

// ==========================================
// JALANKAN SEMUA SETELAH HTML SIAP
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    console.log("✅ Website Afwan Wibowo — Berjalan Lancar!");
    
    initMenu();
    initSiteRating();
    initComments();
    initScrollNav();
});

// ==========================================
// 1. MENU MOBILE
// ==========================================
function initMenu() {
    const menuBtn = document.getElementById("menuButton");
    const navbar = document.getElementById("navbar");
    
    if (!menuBtn || !navbar) return;
    
    menuBtn.addEventListener("click", function() {
        navbar.classList.toggle("show");
    });
    
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", function() {
            navbar.classList.remove("show");
        });
    });
}

// ==========================================
// 2. ID PENGUNJING (untuk mencegah vote ganda)
// ==========================================
function getVisitorId() {
    let id = localStorage.getItem("visitor_id");
    if (!id) {
        id = "visitor-" + Date.now() + "-" + Math.random();
        localStorage.setItem("visitor_id", id);
    }
    return id;
}

// ==========================================
// 3. NILAI WEBSITE — SUKA / TIDAK SUKA
// ==========================================
function initSiteRating() {
    const likeBtn = document.getElementById("siteLike");
    const dislikeBtn = document.getElementById("siteDislike");
    if (!likeBtn || !dislikeBtn) return;
    
    likeBtn.addEventListener("click", () => voteSite("like"));
    dislikeBtn.addEventListener("click", () => voteSite("dislike"));
    
    updateSiteVoteButton();
    loadSiteVotes();
}

function updateSiteVoteButton() {
    const likeBtn = document.getElementById("siteLike");
    const dislikeBtn = document.getElementById("siteDislike");
    const vote = localStorage.getItem("site_vote");
    
    if (likeBtn) likeBtn.classList.toggle("selected", vote === "like");
    if (dislikeBtn) dislikeBtn.classList.toggle("selected", vote === "dislike");
}

async function voteSite(type) {
    const visitorId = getVisitorId();
    const msg = document.getElementById("ratingMessage");
    
    try {
        // Cek apakah sudah pernah voting
        const checkRes = await fetch(
            API + "/site_votes?visitor_id=eq." + encodeURIComponent(visitorId) + "&select=id,vote",
            { headers: HEADERS }
        );
        const existing = await checkRes.json();
        
        if (existing.length > 0) {
            if (existing[0].vote === type) {
                if (msg) msg.textContent = "✅ Kamu sudah memberikan penilaian ini!";
                return;
            }
            // Update vote lama
            await fetch(API + "/site_votes?id=eq." + existing[0].id, {
                method: "PATCH",
                headers: { ...HEADERS, "Prefer": "return=minimal" },
                body: JSON.stringify({ vote: type })
            });
        } else {
            // Tambah vote baru
            await fetch(API + "/site_votes", {
                method: "POST",
                headers: { ...HEADERS, "Prefer": "return=minimal" },
                body: JSON.stringify({ visitor_id: visitorId, vote: type })
            });
        }
        
        localStorage.setItem("site_vote", type);
        if (msg) msg.textContent = "✅ Terima kasih atas penilaianmu!";
        updateSiteVoteButton();
        loadSiteVotes();
        
    } catch (err) {
        console.error(err);
        if (msg) msg.textContent = "❌ Gagal menyimpan penilaian.";
    }
}

async function loadSiteVotes() {
    const likeEl = document.getElementById("likeCount");
    const dislikeEl = document.getElementById("dislikeCount");
    if (!likeEl || !dislikeEl) return;
    
    try {
        const res = await fetch(API + "/site_votes?select=vote", { headers: HEADERS });
        if (!res.ok) throw new Error();
        const data = await res.json();
        likeEl.textContent = data.filter(v => v.vote === "like").length;
        dislikeEl.textContent = data.filter(v => v.vote === "dislike").length;
    } catch {
        likeEl.textContent = "0";
        dislikeEl.textContent = "0";
    }
}

// ==========================================
// 4. KOMENTAR
// ==========================================
function initComments() {
    const form = document.getElementById("commentForm");
    if (!form) return;
    
    loadComments();
    
    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const name = document.getElementById("commentName").value.trim();
        const content = document.getElementById("commentText").value.trim();
        const status = document.getElementById("commentStatus");
        const submitBtn = document.getElementById("commentSubmit");
        
        if (!name || !content) {
            status.textContent = "⚠️ Nama dan komentar wajib diisi!";
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Mengirim...";
        status.textContent = "";
        
        try {
            const res = await fetch(API + "/comments", {
                method: "POST",
                headers: { ...HEADERS, "Prefer": "return=minimal" },
                body: JSON.stringify({ name: name, content: content })
            });
            
            if (!res.ok) throw new Error();
            
            form.reset();
            status.textContent = "✅ Komentar berhasil dikirim!";
            await loadComments();
            
        } catch (err) {
            console.error(err);
            status.textContent = "❌ Gagal mengirim. Coba lagi.";
        }
        
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim Komentar";
    });
}

async function loadComments() {
    const list = document.getElementById("commentsList");
    if (!list) return;
    
    list.innerHTML = '<p class="loading">⏳ Memuat komentar...</p>';
    
    try {
        const res = await fetch(API + "/comments?select=*&order=created_at.desc", { headers: HEADERS });
        if (!res.ok) throw new Error();
        const comments = await res.json();
        
        if (comments.length === 0) {
            list.innerHTML = '<p class="no-comments">💬 Belum ada komentar. Jadilah yang pertama!</p>';
            return;
        }
        
        list.innerHTML = "";
        comments.forEach(c => {
            const tanggal = c.created_at 
                ? new Date(c.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : "";
            
            const card = document.createElement("div");
            card.className = "comment-card";
            card.dataset.id = c.id;
            
            card.innerHTML = `
                <div class="comment-top">
                    <span class="comment-name">${escapeHtml(c.name)}</span>
                    <span class="comment-date">${tanggal}</span>
                </div>
                <div class="comment-text">${escapeHtml(c.content)}</div>
                <div class="comment-actions">
                    <button class="comment-vote like-btn" data-vote="like" data-id="${c.id}">
                        👍 <span class="like-count">0</span>
                    </button>
                    <button class="comment-vote dislike-btn" data-vote="dislike" data-id="${c.id}">
                        👎 <span class="dislike-count">0</span>
                    </button>
                </div>
            `;
            
            list.appendChild(card);
        });
        
        // Tambah event listener untuk tombol vote komentar
        document.querySelectorAll(".comment-vote").forEach(btn => {
            btn.addEventListener("click", function() {
                voteComment(this.dataset.id, this.dataset.vote);
            });
        });
        
        loadCommentVotes();
        
    } catch {
        list.innerHTML = '<p class="no-comments">❌ Gagal memuat komentar.</p>';
    }
}

async function voteComment(commentId, voteType) {
    const visitorId = getVisitorId();
    
    try {
        // Cek apakah sudah pernah vote
        const checkRes = await fetch(
            API + "/comment_votes?comment_id=eq." + commentId + "&visitor_id=eq." + encodeURIComponent(visitorId) + "&select=id,vote",
            { headers: HEADERS }
        );
        const existing = await checkRes.json();
        
        if (existing.length > 0) {
            if (existing[0].vote === voteType) return;
            // Update
            await fetch(API + "/comment_votes?id=eq." + existing[0].id, {
                method: "PATCH",
                headers: { ...HEADERS, "Prefer": "return=minimal" },
                body: JSON.stringify({ vote: voteType })
            });
        } else {
            // Baru
            await fetch(API + "/comment_votes", {
                method: "POST",
                headers: { ...HEADERS, "Prefer": "return=minimal" },
                body: JSON.stringify({ 
                    comment_id: commentId, 
                    visitor_id: visitorId, 
                    vote: voteType 
                })
            });
        }
        
        localStorage.setItem("comment_vote_" + commentId, voteType);
        loadCommentVotes();
        
    } catch (err) {
        console.error(err);
    }
}

async function loadCommentVotes() {
    try {
        const res = await fetch(API + "/comment_votes?select=comment_id,vote,visitor_id", { headers: HEADERS });
        if (!res.ok) return;
        const votes = await res.json();
        
        const grouped = {};
        votes.forEach(v => {
            if (!grouped[v.comment_id]) grouped[v.comment_id] = { like: 0, dislike: 0 };
            if (v.vote === "like" || v.vote === "dislike") grouped[v.comment_id][v.vote]++;
        });
        
        document.querySelectorAll(".comment-card").forEach(card => {
            const id = card.dataset.id;
            const data = grouped[id] || { like: 0, dislike: 0 };
            const visitorId = getVisitorId();
            
            card.querySelector(".like-count").textContent = data.like;
            card.querySelector(".dislike-count").textContent = data.dislike;
            
            // Tandai vote aktif pengunjung
            const myVote = localStorage.getItem("comment_vote_" + id);
            card.querySelectorAll(".comment-vote").forEach(btn => {
                btn.classList.remove("selected");
                if (btn.dataset.vote === myVote) btn.classList.add("selected");
            });
        });
        
    } catch (err) {
        console.error(err);
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

// ==========================================
// 5. NAVIGASI AKTIF SAAT SCROLL
// ==========================================
function initScrollNav() {
    window.addEventListener("scroll", function() {
        const sections = document.querySelectorAll("section[id]");
        let current = "";
        
        sections.forEach(sec => {
            if (window.scrollY >= sec.offsetTop - 150) {
                current = sec.getAttribute("id");
            }
        });
        
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === "#" + current) {
                link.classList.add("active");
            }
        });
    });
}