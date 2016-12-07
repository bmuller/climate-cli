The Gist API provides up to one megabyte of content for each file in the
gist. Each file returned for a gist through the API has a key called
`truncated`. If `truncated` is `true`, the file is too large and only a
portion of the contents were returned in `content`.

If you need the full contents of the file, you can make a `GET` request to
the URL specified by `raw_url`. Be aware that for files larger than ten
megabytes, you'll need to clone the gist via the URL provided by
`git_pull_url`.

In addition to a specific file's contents being truncated, the entire
files list may be truncated if the total number exceeds 300 files. If
the top level `truncated` key is `true`, only the first 300 files have been
returned in the files list. If you need to fetch all of the gist's
files, you'll need to clone the gist via the URL provided by
`git_pull_url`.
