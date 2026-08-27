// Security middleware for role-based access
import jwt from 'jsonwebtoken';

function authenticateToken(req, res, next) {
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log('[AUTH] Incoming token:', token);
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.warn('[AUTH] Invalid token:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        console.log('[AUTH] Token decoded user:', user);
        next();
    });
}

function resolveRoleName(user = {}) {
    const fromToken = (user.role_name || '').toString().trim().toLowerCase();
    if (fromToken) return fromToken;

    // Fallback for old tokens that may only carry role_id.
    if (Number(user.role_id) === 1) return 'super admin';
    if (Number(user.role_id) === 2) return 'admin';
    if (Number(user.role_id) === 3) return 'cultivator';
    return '';
}

function authorizeRoles(...roles) {
    return (req, res, next) => {
        console.log('[AUTH] authorizeRoles check:', {
            user: req.user,
            allowedRoles: roles
        });
        if (!roles.includes(req.user.role_id)) {
            console.warn('[AUTH] Forbidden: user role_id', req.user.role_id, 'not in', roles);
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

function authorizeRoleNames(...roleNames) {
    const allowed = roleNames.map((r) => String(r).trim().toLowerCase());
    return (req, res, next) => {
        const roleName = resolveRoleName(req.user);
        if (!allowed.includes(roleName)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

// policy format example:
// {
//   'super admin': ['*'],
//   admin: ['GET', 'POST'],
//   cultivator: ['GET']
// }
function authorizeRoleAccess(policy = {}) {
    const normalizedPolicy = Object.fromEntries(
        Object.entries(policy).map(([role, methods]) => [
            String(role).trim().toLowerCase(),
            (methods || []).map((m) => String(m).toUpperCase())
        ])
    );

    return (req, res, next) => {
        const roleName = resolveRoleName(req.user);
        const allowedMethods = normalizedPolicy[roleName] || [];
        const method = (req.method || '').toUpperCase();

        if (allowedMethods.includes('*') || allowedMethods.includes(method)) {
            return next();
        }

        return res.status(403).json({ error: 'Forbidden' });
    };
}

export { authenticateToken, authorizeRoles, authorizeRoleNames, authorizeRoleAccess, resolveRoleName };
