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
  const errorCallback = function (jqXHR, textStatus, errorThrown) {
    // parse the response as json
    const response = JSON.parse(jqXHR.responseText);
    if (response.error) {
      alert(response.error);
    } else if (response.redirect) {
      window.location.href = response.redirect;
    } else if (response.message) {
      alert(response.message);
    } else {
      alert("Something went wrong");
    }
  };

  $(document).on("click", ".btn-delete", function (e) {
    e.preventDefault();

    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    const $btn = $(e.currentTarget);
    const postId = $btn.data("id").trim();

    $.ajax({
      url: `/posts/${postId}`,
      method: "DELETE",
      success: function (data) {
        $btn.closest(".card").remove();
      },
      error: errorCallback,
    });
  });

  $(document).on("click", ".btn-approve", function (e) {
    e.preventDefault();

    const $btn = $(e.currentTarget);
    const postId = $btn.data("id").trim();

    $.ajax({
      url: `/posts/${postId}/approve`,
      method: "PUT",
      success: function (data) {
        alert("Post approved!");
        $btn.remove();
      },
      error: errorCallback,
    });
  });

  $(document).on("click", ".btn-upvote", function (e) {
    e.preventDefault();

    const $btn = $(e.currentTarget);
    const postId = $btn.data("id").trim();

    $.ajax({
      url: `/posts/${postId}/vote-up`,
      method: "PUT",
      dataType: "json",
      success: function (data) {
        $(`span[id=${postId}-upvotes-count]`).text(data.upvoteNum);
        $(`span[id=${postId}-downvotes-count]`).text(data.downvoteNum);
      },
      error: errorCallback,
    });
  });

  $(document).on("click", ".btn-downvote", function (e) {
    e.preventDefault();

    const $btn = $(e.currentTarget);
    const postId = $btn.data("id").trim();

    $.ajax({
      url: `/posts/${postId}/vote-down`,
      method: "PUT",
      dataType: "json",
      success: function (data) {
        $(`span[id=${postId}-upvotes-count]`).text(data.upvoteNum);
        $(`span[id=${postId}-downvotes-count]`).text(data.downvoteNum);
      },
      error: errorCallback,
    });
  });
}
