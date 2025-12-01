$(document).ready(function () {
  $("#post-tags").select2({
    tags: true,
    placeholder: "Enter tags",
    minimumInputLength: 1,
    maximumSelectionLength: 5,
  });
});
