module.exports = (data) => { const escapeHtml = (value) => typeof value !== 'string' ? value : value.replace(/&/g, '&amp;').replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); const include = (path, data) => include[path](data); include['partials/footer'] = (data) => { const { title } = data; let output = ''; output += `<p>`; output += escapeHtml(title); output += ` version 1.0.0</p>
`; return output; }; const { title, subTitle } = data; let output = ''; output += `<!DOCTYPE html>
<html lang="en">

<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>
		`; output += escapeHtml(title); output += `
	</title>
</head>

<body>
	<header>
		<h1>
			`; output += escapeHtml(title); output += `
		</h1>`; if (subTitle) { output += `
		<h2>
			`; output += escapeHtml(subTitle); output += `
		</h2>`; } output += `
	</header>

	<main>
		<ul>`; for (let index = 0, length = 100; index < length; index++) { output += `
			<li>`; output += (index); output += `</li>`; } output += `
		</ul>
	</main>

	<footer>
		`; output += (include('partials/footer', { title })); output += `</footer>
</body>

</html>
`; return output; };