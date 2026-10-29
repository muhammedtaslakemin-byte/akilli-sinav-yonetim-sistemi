class ApiConstants {
  // Canlı Sunucu API Adresi
  // Not: W3C standartları gereği Web & Mobil tarayıcılar yalnızca HTTPS bağlantılarında
  // kamera/mikrofon erişimine (getUserMedia) izin verir. Domain veya SSL proxy bağlandığında https kullanılır.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://140.245.7.158:5001/api',
  );
  
  // Yerel Geliştirme Örnekleri:
  // Android Emulator: 'http://10.0.2.2:5001/api'
  // Yerel Web/Masaüstü: 'http://localhost:5001/api'

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String verifyCode = '/auth/verify-code';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // Exams & Sessions Endpoints
  static const String getStudentExams = '/users/me/exams';
  static const String startSession = '/exams/{examId}/session/start';
  static const String getSession = '/exams/session/{sessionId}';
  static const String submitAnswer = '/exams/{examId}/session/answer';
  static const String endSession = '/exams/{examId}/session/end';
  static const String logBiometrics = '/biometrics/log';
  static const String ping = '/ping';
}
