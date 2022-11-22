"use strict";

module.exports = function (data) {
  var escapeHtml = function escapeHtml(value) {
    return typeof value !== 'string' ? value : value.replace(/&/g, '&amp;').replace(/[&<>'"]/g, function (tag) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag;
    });
  };
  var include = function include(path, data) {
    return include[path](data);
  };
  include['partials/footer'] = function (data) {
    var title = data.title;
    var output = '';
    output += "<p>";
    output += escapeHtml(title);
    output += " version 1.0.0</p>\n";
    return output;
  };
  var title = data.title,
    subTitle = data.subTitle;
  var output = '';
  output += "<!DOCTYPE html>\n<html lang=\"en\">\n\n<head>\n\t<meta charset=\"UTF-8\">\n\t<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n\t<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\t<title>\n\t\t";
  output += escapeHtml(title);
  output += "\n\t</title>\n</head>\n\n<body>\n\t<header>\n\t\t<h1>\n\t\t\t";
  output += escapeHtml(title);
  output += "\n\t\t</h1>";
  if (subTitle) {
    output += "\n\t\t<h2>\n\t\t\t";
    output += escapeHtml(subTitle);
    output += "\n\t\t</h2>";
  }
  output += "\n\t</header>\n\n\t<main>\n\t\t<ul>";
  for (var index = 0, length = 100; index < length; index++) {
    output += "\n\t\t\t<li>";
    output += index;
    output += "</li>";
  }
  output += "\n\t\t</ul>\n\t</main>\n\n\t<footer>\n\t\t";
  output += include('partials/footer', {
    title: title
  });
  output += "</footer>\n</body>\n\n</html>\n";
  return output;
};