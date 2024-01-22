# do a curl POST query to an url, with the body data from the file sql.txt


curl -X POST -H "Content-Type: application/json" -d @sql3.txt \
http://localhost:8044/query
