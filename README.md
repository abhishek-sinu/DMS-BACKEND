# DMS-BACKEND

## How to Start the Backend

1. Open a terminal and navigate to the `DMS-BACKEND` directory:
	```sh
	cd DMS-BACKEND
	```
2. Install npm from website & dependencies by command:
	```sh
	npm install
	```
3. Put .env file with db details in root directory and start the backend server:
	```sh
	npm start
	```
4. The backend will run on the port specified in your configuration (commonly 3001 or as set in your code).

---



# DMS-DATABASE

## How to Start the database

1. Install mysql database server(GUI) and connect using connection details.
2. Access sql code from database_sql folder and run all of them to have all the tables in local mysql server.
3. Put .env file with db details in root directory and start the backend server:
	```sh
	npm start
	```
4. The backend will run on the port specified in your configuration (5000). _Append_ 'api/donors' in url to see donors data from your local database.
---


# New route addition

## How to add new route

1. Make new file in routes folder and add your file_name.js file.
2. Update server.js file to include your new route details.
3. 


---