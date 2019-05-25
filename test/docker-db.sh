#!/bin/bash

if [ "$1" = "run" ]; then
    #create MariaDB container
    docker run --name oauth-mariadb -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=oauth-test -p 127.0.0.1:3306:3306 -d mariadb:latest
    #create phpmyadmin container
    docker run --name oauth-phpmyadmin -d --link oauth-mariadb:db -p 8080:80 phpmyadmin/phpmyadmin
elif [ "$1" = "start" ]; then
    #start MariaDB
    docker start oauth-mariadb
    #start phpmyadmin
    docker start oauth-phpmyadmin
elif [ "$1" = "stop" ]; then
    #stop MariaDB
    docker stop oauth-mariadb
    #stop phpmyadmin
    docker stop oauth-phpmyadmin
elif [ "$1" = "rm" ]; then
    #remove MariaDB
    docker rm oauth-mariadb
    #remove phpmyadmin
    docker rm oauth-phpmyadmin
else
    echo "Unknown argument: \"$1\""
    echo "Available arguments: run, start, stop, rm"
fi
