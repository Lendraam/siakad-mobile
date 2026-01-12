<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\User;
use App\Models\Task;
use App\Models\Message;
use Illuminate\Support\Facades\Hash;
use GuzzleHttp\Client;

Route::post('/login', function (Request $request) {
    $user = User::where('nim', $request->nim)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Login gagal'
        ], 401);
    }

    return response()->json([
        'message' => 'Login berhasil',
        'user' => $user
    ]);
});

// Register new user
Route::post('/register', function (Request $request) {
    $data = $request->only(['nim', 'name', 'email', 'password']);
    if (empty($data['nim']) || empty($data['name']) || empty($data['password'])) {
        return response()->json(['message' => 'Invalid request'], 400);
    }

    if (User::where('nim', $data['nim'])->exists()) {
        return response()->json(['message' => 'NIM already registered'], 409);
    }

    $u = User::create([
        'nim' => $data['nim'],
        'name' => $data['name'],
        'email' => $data['email'] ?? null,
        'password' => Hash::make($data['password']),
    ]);

    return response()->json(['message' => 'Registered', 'user' => $u]);
});

// Change password
Route::post('/user/change-password', function (Request $request) {
    $data = $request->only(['nim', 'old_password', 'new_password']);
    if (empty($data['nim']) || empty($data['old_password']) || empty($data['new_password'])) {
        return response()->json(['message' => 'Invalid request'], 400);
    }

    $user = User::where('nim', $data['nim'])->first();
    if (!$user) return response()->json(['message' => 'User not found'], 404);

    if (!Hash::check($data['old_password'], $user->password)) {
        return response()->json(['message' => 'Old password is incorrect'], 403);
    }

    $user->password = Hash::make($data['new_password']);
    $user->save();

    return response()->json(['message' => 'Password updated successfully']);
});

// Save FCM token for a user
Route::post('/user/fcm-token', function (Request $request) {
    $data = $request->only(['nim', 'fcm_token']);
    if (empty($data['nim']) || empty($data['fcm_token'])) {
        return response()->json(['message' => 'Invalid request'], 400);
    }
    $user = User::where('nim', $data['nim'])->first();
    if (!$user) return response()->json(['message' => 'User not found'], 404);
    $user->fcm_token = $data['fcm_token'];
    $user->save();
    return response()->json(['message' => 'FCM token saved', 'user' => $user]);
});

// DEBUG: list users - remove in production
Route::get('/debug/users', function () {
    return response()->json(
        User::all()
    );
});

Route::get('/debug/user/{nim}', function ($nim) {
    $user = User::where('nim', $nim)->first();
    if (!$user) return response()->json(['message' => 'not found'], 404);
    return response()->json($user);
});

// create dosen user quickly for testing
Route::get('/debug/create-dosen', function () {
    $nim = 'dosen';
    $user = User::where('nim', $nim)->first();
    if ($user) {
        return response()->json(['message' => 'exists', 'user' => $user]);
    }
    $u = User::create([
        'nim' => $nim,
        'name' => 'Dosen',
        'email' => 'dosen@example.com',
        'password' => Hash::make('dosen'),
    ]);
    return response()->json(['message' => 'created', 'user' => $u]);
});

// Tasks API
Route::get('/tasks', function (Request $request) {
    $nim = $request->query('nim');
    if (!$nim) return response()->json([], 400);
    $tasks = Task::where('user_nim', $nim)->orderBy('created_at', 'desc')->get();
    return response()->json($tasks);
});

Route::post('/tasks', function (Request $request) {
    $data = $request->only(['user_nim', 'title', 'done']);
    $task = Task::create($data);
    return response()->json($task);
});

Route::put('/tasks/{id}', function ($id, Request $request) {
    $task = Task::findOrFail($id);
    $task->update($request->only(['title', 'done']));
    return response()->json($task);
});

Route::delete('/tasks/{id}', function ($id) {
    $task = Task::findOrFail($id);
    $task->delete();
    return response()->json(['deleted' => true]);
});

// Messages API
Route::get('/messages', function (Request $request) {
    $nim = $request->query('nim');
    if (!$nim) return response()->json([], 400);
    // limit payload size for mobile clients. Accept ?limit= param (max 200), default 50
    $limit = intval($request->query('limit', 50));
    if ($limit <= 0) $limit = 50;
    $limit = min($limit, 200);

    $msgs = Message::where('user_nim', $nim)
        ->orderBy('created_at', 'desc')
        ->limit($limit)
        ->get(['id', 'user_nim', 'from', 'text', 'read', 'created_at']);

    // truncate long text fields to avoid huge payloads
    $trimmed = $msgs->map(function($m) {
        $m->text = mb_strlen($m->text ?: '') > 1000 ? mb_substr($m->text, 0, 1000) . '...' : $m->text;
        return $m;
    });

    return response()->json($trimmed);
});

Route::post('/messages', function (Request $request) {
    $data = $request->only(['user_nim', 'from', 'text', 'read']);
    $msg = Message::create($data);

    // Try to notify recipient via FCM if they have a token
    try {
        $recipient = User::where('nim', $data['user_nim'])->first();
        if ($recipient && !empty($recipient->fcm_token)) {
            $serverKey = env('FIREBASE_SERVER_KEY');
            if (!empty($serverKey)) {
                $client = new Client();
                try {
                    $client->post('https://fcm.googleapis.com/fcm/send', [
                        'headers' => [
                            'Authorization' => 'key ' . $serverKey,
                            'Content-Type' => 'application/json'
                        ],
                        'json' => [
                            'to' => $recipient->fcm_token,
                            'notification' => [
                                'title' => 'Pesan baru dari ' . ($data['from'] ?? 'Pengirim'),
                                'body' => substr($data['text'] ?? '', 0, 200)
                            ],
                            'data' => [
                                'type' => 'message',
                                'from' => $data['from'] ?? null
                            ]
                        ]
                    ]);
                } catch (\Exception $e) {
                    // ignore send failures
                }
            }
        }
    } catch (\Exception $e) {
        // ignore notification errors
    }

    return response()->json($msg);
});

Route::put('/messages/{id}', function ($id, Request $request) {
    $msg = Message::findOrFail($id);
    $msg->update($request->only(['read']));
    return response()->json($msg);
});

// Debug: send push via FCM server key
Route::post('/debug/send-push', function (Request $request) {
    $token = $request->input('token');
    $title = $request->input('title', 'Test Notifikasi');
    $body = $request->input('body', 'Halo dari server');

    $serverKey = env('FIREBASE_SERVER_KEY');
    if (empty($serverKey)) {
        return response()->json(['error' => 'FIREBASE_SERVER_KEY not configured'], 500);
    }

    $client = new Client();
    try {
        $res = $client->post('https://fcm.googleapis.com/fcm/send', [
            'headers' => [
                'Authorization' => 'key ' . $serverKey,
                'Content-Type' => 'application/json'
            ],
            'json' => [
                'to' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body
                ],
                'data' => [
                    'click_action' => 'FLUTTER_NOTIFICATION_CLICK'
                ]
            ]
        ]);

        $bodyResp = (string) $res->getBody();
        return response()->json(json_decode($bodyResp, true));
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});
