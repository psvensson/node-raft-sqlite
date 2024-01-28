# do a curl POST query to an url, with the body data from the file sql.txt


curl -X POST -H "Content-Type: application/json" -d @sql4.txt \
http://localhost:8064/query
