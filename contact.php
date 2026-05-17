<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
    fail(403, 'invalid_request');
}

$origin   = $_SERVER['HTTP_ORIGIN']  ?? '';
$referer  = $_SERVER['HTTP_REFERER'] ?? '';
$originOk = $origin  !== '' && parse_url($origin,  PHP_URL_HOST) === 'access-ia.pro';
$refOk    = $referer !== '' && str_starts_with($referer, 'https://access-ia.pro/');
if ($origin !== '' && !$originOk) {
    fail(403, 'invalid_origin');
}
if ($origin === '' && !$refOk) {
    fail(403, 'invalid_origin');
}

function field(string $name, int $max): string
{
    $value = isset($_POST[$name]) ? trim((string) $_POST[$name]) : '';
    $value = str_replace(["\r", "\0"], '', $value);
    return substr($value, 0, $max);
}

function fail(int $status, string $error): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (field('website', 200) !== '') {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = field('name', 120);
$email = field('email', 160);
$company = field('company', 160);
$need = field('need', 120);
$message = field('message', 2000);

if ($name === '' || $email === '' || $message === '') {
    fail(422, 'missing_required_fields');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail(422, 'invalid_email');
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateKey = preg_replace('/[^a-zA-Z0-9_.:-]/', '_', $ip);
$rateDir = sys_get_temp_dir() . '/accessia_rl';
if (!is_dir($rateDir)) {
    @mkdir($rateDir, 0700, true);
}
$rateFile = $rateDir . '/c_' . sha1($rateKey);
$now = time();
$window = 3600;
$maxAttempts = 5;
$attempts = [];

if (is_file($rateFile)) {
    $stored = json_decode((string) file_get_contents($rateFile), true);
    if (is_array($stored)) {
        $attempts = array_values(array_filter($stored, static fn ($ts) => is_int($ts) && $ts > $now - $window));
    }
}

if (count($attempts) >= $maxAttempts) {
    fail(429, 'rate_limited');
}

$attempts[] = $now;
file_put_contents($rateFile, json_encode($attempts), LOCK_EX);

$to = 'contact@access-ia.pro';
$subject = '[ACCESSIA Pro] Demande de contact';
$body = implode("\n", [
    'Nouvelle demande de contact depuis access-ia.pro',
    '',
    'Nom : ' . $name,
    'Email : ' . $email,
    'Societe : ' . ($company !== '' ? $company : 'Non renseignee'),
    'Besoin : ' . ($need !== '' ? $need : 'Non precise'),
    'IP : ' . $ip,
    '',
    'Message :',
    $message,
]);

$safeNameRaw = trim(preg_replace('/[^\p{L}\p{N} \-\'\.]/u', '', $name) ?? '');
$safeName = $safeNameRaw !== '' ? mb_encode_mimeheader($safeNameRaw, 'UTF-8', 'Q') : '';
$safeEmail = preg_match('/[\r\n]/', $email) === 1 ? '' : $email;
if ($safeEmail === '') {
    fail(422, 'invalid_email');
}
$replyTo = $safeName !== ''
    ? 'Reply-To: ' . $safeName . ' <' . $safeEmail . '>'
    : 'Reply-To: <' . $safeEmail . '>';

$headers = [
    'From: ACCESSIA Pro <contact@access-ia.pro>',
    $replyTo,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: ACCESSIA Pro contact form',
];

$sent = mail($to, $subject, $body, implode("\r\n", $headers), '-fcontact@access-ia.pro');

if (!$sent) {
    fail(500, 'mail_send_failed');
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
