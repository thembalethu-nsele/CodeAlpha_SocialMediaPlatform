CodeAlpha_SocialMediaPlatform

A full-stack mini social media web application built for the CodeAlpha Full Stack Development Internship (Task 2). Users can create profiles, share posts with text and photos, like and comment on posts, follow other users, and search for people.

Live demo: You can use the QR code provided in the files, or use the link to acess the platform,
https://codealpha-socialmediaplatform-c5cd.onrender.com (The site is on a free plan and goes to sleep when unused, so the first load can take about a minute.)

Scan the QR code

You can also open the live app by scanning the QR code with your phone camera. The code is in the project files at docs/social-media-qr.png.

Scan to open the app

Features

Accounts and profiles

Register and log in (JWT authentication, hashed passwords)
View any user's profile with their posts, followers and following counts
Edit your profile: change your username, write a bio, and upload a profile picture from your device

Posts

Create a post with text only, a photo only, or both
Upload photos directly from your device (resized in the browser before saving)
Delete your own posts
Feed showing your posts and posts from people you follow

Interaction

Like and unlike posts
Comment on posts, and delete your own comments (post owners can delete comments on their posts)
Follow and unfollow other users
Search for users by username
Tech stack
Layer	Technology
Frontend	HTML, CSS, JavaScript
Backend	Node.js, Express
Database	MongoDB Atlas (Mongoose)
Authentication	JSON Web Tokens (JWT), bcrypt
Hosting	Render (server), MongoDB Atlas (database)
Option A: Use the live site (nothing to install)
Open the live demo link above, or scan the QR code.
Click Register and create an account (username, email and a password of at least 6 characters).
On the Feed page, write a post, and optionally click Add photo to attach a picture.
Click the heart to like a post, and the speech bubble to read and write comments.
Open Search, find another user, open their profile and click Follow. Their posts now appear in your feed.
Open Profile and click Edit profile to add a bio and a profile picture.

Tip: to see the follow feature working, open the site in a private window and register a second account.
____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________

Option B: Clone it and run your own copy

The repository does not include a database or any passwords. To run your own copy you must create your own free MongoDB Atlas database and connect it through a .env file.

1. Install the requirements
Node.js (LTS version)
Git

Check that both are installed:

bash
node -v
npm -v
git --version
2. Clone the repository
bash
git clone https://github.com/thembalethu-nsele/CodeAlpha_SocialMediaPlatform.git
cd CodeAlpha_SocialMediaPlatform
npm install
3. Create your own database (MongoDB Atlas, free)
Go to mongodb.com/atlas and sign up.
Create a free M0 cluster.
Open Database Access, click Add New Database User, and choose a username and a password. Use only letters and numbers in the password, and write it down.
Open Network Access, click Add IP Address, and choose Allow Access From Anywhere (0.0.0.0/0). Click Confirm.
Open your cluster, click Connect, choose Drivers, and copy the connection string. It looks like this:
mongodb+srv://USERNAME:<db_password>@yourcluster.xxxxx.mongodb.net/

You do not need to create any tables or collections. MongoDB creates them automatically when the app saves data.

4. Create the .env file

In the project's main folder, copy .env.example to a new file named .env:

bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac / Linux
cp .env.example .env

Open .env and fill in your values:

MONGO_URI=mongodb+srv://USERNAME:YOUR_PASSWORD@yourcluster.xxxxx.mongodb.net/socialmedia?retryWrites=true&w=majority
JWT_SECRET=any_long_random_text
PORT=5000
Replace USERNAME and YOUR_PASSWORD with your database user's details (no < or > characters).
/socialmedia after the host name is the database name.
JWT_SECRET can be any long random text.
Never commit your .env file. It is already listed in .gitignore.
5. Start the server
bash
npm run dev

Wait for these two lines:

MongoDB connected
Server running on http://localhost:5000

Then open http://localhost:5000 in your browser and register an account. There is no sample data to load, because users and posts are created through the app.

Collections in the socialmedia database, matching the class diagram:

users: username, email, password (hashed), bio, avatarUrl
posts: author, content, imageUrl
comments: post, author, text
likes: user, post (a user can like a post only once)
follows: follower, following (a user can follow another user only once)

Uploaded pictures are resized in the browser and stored inside the database, so they are not lost when the hosting server restarts.

Documentation

The use case diagram and class diagram are in the docs folder.



Thembalethu Nsele Built as part of the CodeAlpha Full Stack Development Internship.# CodeAlpha_SocialMediaPlatform
Mini social media web with user profiles, posts, comments, and a link/follow system. Built with HTML,CSS,JavaScripts,Node.js.
