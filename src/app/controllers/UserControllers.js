const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const { promisify } = require('util');
const { json } = require('express/lib/response');
const unlinkAsync = promisify(fs.unlink);

class UserControllers {
    //[GET] /user/
    show(req, res, next) {
        let myUser = req.decoded;
        // Creating Query
        let query =
            "SELECT  t.id_user, t.nickname, t.full_name, t.avatar, t.tick, t.followed, t.following, t.total_likes, t.id_video , t.video_url, t.music, t.download,t.share,t.description,t.likes,t.comments , (SELECT COUNT(*) FROM user_follow_user d WHERE d.id_user_followed = t.id_user AND d.id_user_following LIKE '" +
            myUser.id_user +
            "') AS follow_user, (SELECT COUNT(*) FROM user_like_videos e WHERE e.id_user LIKE '" +
            myUser.id_user +
            "' AND e.id_video = t.id_video) as like_video FROM ( SELECT a.id_user, a.nickname, a.full_name, a.avatar, a.tick, a.followed, a.following, a.total_likes, c.id_video , c.video_url, c.music, c.download,c.share,c.description,c.likes,c.comments FROM users a, user_have_videos b, videos c WHERE a.id_user = b.id_user AND c.id_video = b.id_video ) AS t  GROUP BY t.id_user, t.nickname, t.full_name, t.avatar, t.tick, t.followed, t.following, t.total_likes, t.id_video , t.video_url, t.music, t.download,t.share,t.description,t.likes,t.comments  ORDER BY RAND() LIMIT 5";

        db.query(query, function (err, result) {
            if (err) return res.status(400);
            res.status(200).json({ data: result });
        });
    }

    //[GET] /user/suggestAccounts
    showSuggestAccounts(req, res, next) {
        var myUser = req.decoded;
        var query;

        // Creating Query
        query =
            "SELECT t.id_user, t.nickname, t.full_name, t.avatar, t.tick, t.followed, t.total_likes, COUNT(b.id_user_followed) as follow_user FROM (SELECT * FROM users a  WHERE a.id_user NOT LIKE '" +
            myUser.id_user +
            "') t LEFT JOIN user_follow_user b ON t.id_user = b.id_user_followed AND b.id_user_following LIKE '" +
            myUser.id_user +
            "' GROUP BY  t.id_user, t.nickname, t.full_name, t.avatar, t.tick, t.followed, t.total_likes  ORDER BY RAND() LIMIT 10  ";

        //response
        db.query(query, function (err, result) {
            if (err) return res.status(400);
            res.status(200).json({ data: result });
        });
    }

    //[GET] /user/showMyUSer
    showMyUser(req, res, next) {
        res.status(200).json({ data: req.decoded });
    }

    //[GET] /user/userProfile
    showUserProfile(req, res, next) {
        var { id_user } = req.query;
        var query, checkFollowQuery;
        var myUser = req.decoded;
        var isFollowing;

        // Creating Query
        checkFollowQuery =
            "SELECT COUNT(*) as follow_user FROM user_follow_user a WHERE a.id_user_following = '" +
            myUser.id_user +
            "' AND a.id_user_followed = '" +
            id_user +
            "'";

        query = "SELECT * FROM users WHERE id_user = '" + id_user + "'";

        //response
        db.query(checkFollowQuery, function (err, result) {
            if (err) return res.status(400);
            isFollowing = result[0].follow_user;
        });

        db.query(query, function (err, result) {
            if (err) return res.status(400);
            res.status(200).json({ data: { ...result[0], follow_user: isFollowing } });
        });
    }

    //[GET] /user/listUserVideos
    showListVideos(req, res, next) {
        var { id_user } = req.query;
        var query;

        // Creating Query
        query =
            "SELECT * FROM videos, user_have_videos WHERE videos.id_video = user_have_videos.id_video AND user_have_videos.id_user = '" +
            id_user +
            "'";

        //response
        db.query(query, function (err, result) {
            if (err) return res.status(400);
            res.status(200).json({ data: result });
        });
    }

    //[POST] /user/uploadVideo
    async uploadVideo(req, res, next) {
        const file = req.file;
        const info = JSON.parse(JSON.parse(JSON.stringify(req.body)).info);
        const user = req.decoded;
        var dataVideo, queryCreateVideo, queryUserHaveVideo;

        try {
            await cloudinary.uploader.upload(
                file.path,
                {
                    resource_type: 'video',
                    folder: 'video',
                },
                function (err, result) {
                    dataVideo = result;
                },
            );
        } catch (error) {
            le.log(error);
        }

        await unlinkAsync(file.path);

        // Creating Query
        queryCreateVideo =
            "INSERT INTO videos (id_video, video_url, description, music) VALUES ('" +
            dataVideo.asset_id +
            "', '" +
            dataVideo.url +
            "', '" +
            info.description +
            "', '" +
            info.music +
            "') ";

        queryUserHaveVideo =
            "INSERT INTO user_have_videos (id_user, id_video) VALUES ('" +
            user.id_user +
            "', '" +
            dataVideo.asset_id +
            "') ";
        //response
        db.query(queryCreateVideo, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(queryUserHaveVideo, function (err, result) {
            if (err) return res.status(400);
        });
        res.json({ message: 'upload video thanh cong' });
    }

    //[POST] /user/like
    likeVideo(req, res, next) {
        var { id_user, id_video } = req.body;
        var myUser = req.decoded;
        var update_Users_TotalLikesQuery, create_UserLikeVideosQuery, update_Videos_LikesQuery;

        // Creating Query
        update_Users_TotalLikesQuery =
            "UPDATE users SET total_likes = total_likes+1 WHERE id_user='" + id_user + "'";

        update_Videos_LikesQuery =
            "UPDATE videos SET likes = likes+1 WHERE id_video='" + id_video + "'";
        create_UserLikeVideosQuery =
            "INSERT INTO user_like_videos (id_user, id_video) VALUES ('" +
            myUser.id_user +
            "', '" +
            id_video +
            "');";

        //response
        db.query(update_Users_TotalLikesQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(update_Videos_LikesQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(create_UserLikeVideosQuery, function (err, result) {
            if (err) return res.status(400);
        });
    }

    //[POST] /user/unlike
    unlikeVideo(req, res, next) {
        var { id_user, id_video } = req.body;
        var myUser = req.decoded;
        var update_Users_TotalLikesQuery, delete_UserLikeVideosQuery, update_Videos_LikesQuery;

        // Creating Query
        update_Users_TotalLikesQuery =
            "UPDATE users SET total_likes = total_likes-1 WHERE id_user='" + id_user + "'";

        update_Videos_LikesQuery =
            "UPDATE videos SET likes = likes-1 WHERE id_video='" + id_video + "'";
        delete_UserLikeVideosQuery =
            "DELETE FROM user_like_videos WHERE user_like_videos.id_user = '" +
            myUser.id_user +
            "' AND user_like_videos.id_video = '" +
            id_video +
            "'";

        //response
        db.query(update_Users_TotalLikesQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(update_Videos_LikesQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(delete_UserLikeVideosQuery, function (err, result) {
            if (err) return res.status(400);
        });
    }

    //[POST] /user/follow
    follow(req, res, next) {
        var { id_user } = req.body;
        var myUser = req.decoded;
        var update_Users_FollowedQuery, update_Users_FollowingQuery, create_UserFollowUserQuery;

        // Creating Query
        update_Users_FollowedQuery =
            "UPDATE users SET followed = followed+1 WHERE id_user='" + id_user + "'";

        update_Users_FollowingQuery =
            "UPDATE users SET following = following+1 WHERE id_user='" + myUser.id_user + "'";
        create_UserFollowUserQuery =
            "INSERT INTO user_follow_user (id_user_following, id_user_followed) VALUES ('" +
            myUser.id_user +
            "', '" +
            id_user +
            "');";

        //response
        db.query(update_Users_FollowedQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(update_Users_FollowingQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(create_UserFollowUserQuery, function (err, result) {
            if (err) return res.status(400);
        });
    }

    //[POST] /user/unfollow
    unFollow(req, res, next) {
        var { id_user } = req.body;
        var myUser = req.decoded;
        var update_Users_FollowedQuery, update_Users_FollowingQuery, delete_UserFollowUserQuery;

        // Creating Query
        update_Users_FollowedQuery =
            "UPDATE users SET followed = followed-1 WHERE id_user='" + id_user + "'";

        update_Users_FollowingQuery =
            "UPDATE users SET following = following-1 WHERE id_user='" + myUser.id_user + "'";
        delete_UserFollowUserQuery =
            "DELETE FROM user_follow_user WHERE user_follow_user.id_user_following = '" +
            myUser.id_user +
            "' AND user_follow_user.id_user_followed = '" +
            id_user +
            "'";

        //response
        db.query(update_Users_FollowedQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(update_Users_FollowingQuery, function (err, result) {
            if (err) return res.status(400);
        });

        db.query(delete_UserFollowUserQuery, function (err, result) {
            if (err) return res.status(400);
        });
    }
}

module.exports = new UserControllers();
