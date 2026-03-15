import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * VIP gate — redirects to dashboard if logged in, otherwise to login.
 */
const Vip = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem("vip_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.verified) {
          navigate("/vip/dashboard", { replace: true });
          return;
        }
      } catch { /* invalid */ }
    }
    navigate("/vip/login", { replace: true });
  }, [navigate]);

  return null;
};

export default Vip;
