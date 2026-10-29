const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                forename: true,
                surname: true,
                isActive: true,
                role: { select: { name_tr: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Kullanıcılar getirilirken hata oluştu' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Geçersiz kullanıcı ID\'si' });
        }

        // Yetki kontrolü: Kullanıcı sadece kendi profilini veya Yönetici/Akademisyen ise profilleri görebilir
        if (req.user.id !== userId && req.user.role !== 'Yönetici' && req.user.role !== 'Akademisyen') {
            return res.status(403).json({ message: 'Bu profili görüntüleme yetkiniz bulunmamaktadır.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                forename: true,
                surname: true,
                photo: true,
                role: { select: { name_tr: true } }
            }
        });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Profil getirilirken hata oluştu' });
    }
};

// PUT /api/users/me  —  Kendi profilini güncelle
exports.updateMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { forename, surname, photo, currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

        const updateData = { forename, surname, photo };

        // Şifre güncelleme isteği varsa doğrula
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Mevcut şifre zorunludur' });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Mevcut şifre hatalı' });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(newPassword, salt);
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true, username: true, email: true,
                forename: true, surname: true, photo: true,
                role: { select: { name_tr: true } }
            }
        });

        res.json({ message: 'Profil güncellendi', user: { ...updated, role: updated.role.name_tr } });
    } catch (error) {
        console.error('updateMe error:', error);
        res.status(500).json({ message: 'Profil güncellenirken hata oluştu' });
    }
};

// GET /api/users/me/exams  —  Öğrencinin sınavlarını getir
exports.getMyExams = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { branches: { select: { id: true } } }
        });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });

        const branchIds = user.branches.map(b => b.id);

        let exams;

        if (branchIds.length > 0) {
            // Öğrenci kayıtlı olduğu şubelerin sınavlarını görür
            exams = await prisma.exam.findMany({
                where: { branchId: { in: branchIds } },
                include: {
                    branch: { select: { name: true } },
                    teacher: { select: { forename: true, surname: true } }
                },
                orderBy: { startTime: 'asc' }
            });
        } else {
            // Öğrencinin atanmış bir şubesi yoksa boş liste dön (veri izolasyonu ve 403 çelişkisini engelle)
            exams = [];
        }

        const result = exams.map(exam => ({
            ...exam,
            branchName: exam.branch?.name || 'Genel'
        }));

        res.json(result);
    } catch (error) {
        console.error('getMyExams error:', error);
        res.status(500).json({ message: 'Sınavlar getirilirken hata oluştu' });
    }
};


exports.deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Geçersiz kullanıcı ID\'si' });
        }

        // Yöneticinin kendi hesabını silmesini engelle
        if (req.user && req.user.id === userId) {
            return res.status(400).json({ message: 'Güvenlik nedeniyle kendi yönetici hesabınızı silemezsiniz.' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        await prisma.user.delete({ where: { id: userId } });
        res.json({ message: 'Kullanıcı başarıyla silindi' });
    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({ message: 'Kullanıcı silinirken hata oluştu' });
    }
};

// GET /api/users/me/sessions
exports.getMySessions = async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await prisma.examSession.findMany({
            where: { userId },
            include: {
                exam: {
                    select: {
                        id: true,
                        title: true,
                        durationMin: true,
                        isSupervised: true,
                        branch: { select: { name: true } },
                        questions: { select: { id: true, type: true } }
                    }
                },
                answers: {
                    include: {
                        question: { select: { text: true, type: true } },
                        option: { select: { id: true, text: true, isCorrect: true } }
                    }
                },
                logs: {
                    select: {
                        id: true,
                        type: true,
                        description: true,
                        timestamp: true
                    },
                    orderBy: { timestamp: 'desc' }
                }
            },
            orderBy: { startTime: 'desc' }
        });

        // Güvenlik Düzeltmesi: Oturum tamamlanmamışsa doğruluk (isCorrect) bilgisini gizle
        const sanitizedSessions = sessions.map(session => {
            if (session.status !== 'COMPLETED') {
                return {
                    ...session,
                    answers: session.answers.map(ans => {
                        if (ans.option) {
                            const { isCorrect, ...rest } = ans.option;
                            return { ...ans, option: rest };
                        }
                        return ans;
                    })
                };
            }
            return session;
        });

        res.json(sanitizedSessions);
    } catch (error) {
        console.error('getMySessions error:', error);
        res.status(500).json({ message: 'Oturumlar getirilirken hata oluştu' });
    }
};


