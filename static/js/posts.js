$(document).ready(function () {
  alwaysOn();

  let loading = false;
  let finalPage = false;
  $(window).scroll(function () {
    if (loading || finalPage) return;

    var position = Math.floor($(window).scrollTop() + 1);
    var height = $(document).height() - $(window).height();
    if (position >= height && window.location.pathname === "/") {
      loading = true;
      var urlParams = new URLSearchParams(window.location.search);
      var page = parseInt(urlParams.get("page") || 1) + 1;

      $.ajax({
        type: "GET",
        url: "/posts/more?page=" + page,
        success: function (data) {
          if (data.trim().length === 0) {
            finalPage = true;
          } else {
            $("#posts-container").append(data);
            $('[data-toggle="tooltip"]').tooltip();
          }

          const url = new URL(window.location);
          url.searchParams.set("page", page);
          history.pushState({}, "", url);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          if (jqXHR.status == 404) {
            finalPage = true;
          }
        },
        complete: function () {
          loading = false;
        },
      });
    }
  });
});

function alwaysOn() {
  $(document).on("submit", ".upvote-form", function (e) {
    e.preventDefault();
    const $form = $(e.currentTarget);
    const postId = $form.data("id").trim();
    const btnId = $form.find("input[type=submit]:focus").prevObject[0][0].id;
    const upSpan = $form.find("span");
    const downSpan = $(".downvote-form").find(`span[id=${postId}downspan]`);

    let upvoteNum = parseInt(upSpan.text());
    let downvoteNum = parseInt(downSpan.text());

    if ($("#" + postId + "upbtn").hasClass("btn-primary")) upvoteNum--;
    else upvoteNum++;

    if ($("#" + postId + "downbtn").hasClass("btn-primary")) {
      $("#" + postId + "downbtn").toggleClass("btn-primary btn-secondary");
      downvoteNum--;
    }

    $("#" + btnId).toggleClass("btn-primary btn-secondary");

    upSpan.text(upvoteNum);
    downSpan.text(downvoteNum);

    let url = postId + "/vote-up";
    if (!window.location.href.includes("posts/" + postId)) {
      url = "posts/" + postId + "/vote-up";
    }

    $.ajax({
      type: "PUT",
      url: url,
    });
  });

  $(document).on("submit", ".downvote-form", function (e) {
    e.preventDefault();
    const $form = $(e.currentTarget);
    const postId = $form.data("id").trim();
    const btnId = $form.find("input[type=submit]:focus").prevObject[0][0].id;
    const upSpan = $(".upvote-form").find(`span[id=${postId}upspan]`);
    const downSpan = $form.find("span");

    let upvoteNum = parseInt(upSpan.text());
    let downvoteNum = parseInt(downSpan.text());

    if ($("#" + postId + "downbtn").hasClass("btn-primary")) downvoteNum--;
    else downvoteNum++;

    if ($("#" + postId + "upbtn").hasClass("btn-primary")) {
      $("#" + postId + "upbtn").toggleClass("btn-primary btn-secondary");
      upvoteNum--;
    }

    $("#" + btnId).toggleClass("btn-primary btn-secondary");

    upSpan.text(upvoteNum);
    downSpan.text(downvoteNum);

    if (window.location.href.includes("posts/" + postId)) {
      $.ajax({
        type: "PUT",
        url: postId + "/vote-down",
      });
    } else {
      $.ajax({
        type: "PUT",
        url: "posts/" + postId + "/vote-down",
      });
    }
  });
}
