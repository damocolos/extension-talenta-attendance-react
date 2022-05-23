import './App.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(0);
  const [profile, setProfile] = useState({});
  const [config, setConfig] = useState({});
  const [showOptions, setShowOptions] = useState(false);
  const [optionsForm, setOptionsForm] = useState({});

  const URL = 'https://resilient-cat-092f6d.netlify.app/.netlify/functions/api';

  useEffect(() => {
    chrome.storage.sync.get('talentaConfig', ({ talentaConfig }) => {
      setConfig(talentaConfig);
      setOptionsForm(talentaConfig);
    });
  }, []);

  useEffect(() => {
    if (config.authCookie && config.authCookie != '') {
      getHistory();
      getUserProfile();
    }
  }, [config]);

  const onToggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const onSaveOption = () => {
    setShowOptions(false);
    chrome.storage.sync.set(
      {
        talentaConfig: optionsForm,
      },
      function () {
        setConfig(optionsForm);
        setTimeout(() => {
          getHistory();
          getUserProfile();
        }, 500);
      }
    );
  };

  const handleChange = (i, event) => {
    let values = { ...optionsForm };
    values[i] = event.target.value;
    setOptionsForm(values);
  };

  const getTodayDate = () => {
    const today = new Date();
    return `${today.getDate()}-${('0' + (today.getMonth() + 1)).slice(
      -2
    )}-${today.getFullYear()}`;
  };

  const getTodayDateLong = () => {
    const today = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return today.toLocaleDateString('en-GB', options);
  };

  const getHistory = async () => {
    const resp = await axios({
      method: 'post',
      url: `${URL}/history`,
      data: {
        token: config.authCookie,
        date: getTodayDate(),
      },
    }).catch((err) => console.log(err));

    if (resp?.data) {
      const respHistory = resp.data;

      setHistory([]);

      if (respHistory.length) {
        const result = respHistory.map((j) => ({
          type: j.check_type === 1 ? 'clockin' : 'clockout',
          time: j.check_time,
        }));

        setHistory(result);

        for (const r of result) {
          if (r.type === 'clockin' && attendanceStatus !== 3) {
            setAttendanceStatus(2);
          } else if (r.type === 'clockout') {
            setAttendanceStatus(3);
          }
        }
      } else {
        setAttendanceStatus(1);
      }
    }
  };

  const getUserProfile = async () => {
    const resp = await axios({
      method: 'post',
      url: `${URL}/profile`,
      data: {
        token: config.authCookie,
      },
    });
    if (resp?.data) {
      setProfile(resp.data);
    }
  };

  const onClock = async (type) => {
    setIsLoading(true);

    const resp = await axios({
      method: 'post',
      url: `${URL}/live-attendance`,
      data: {
        token: config.authCookie,
        latitude: config.latitude,
        longitude: config.longitude,
        type: type === 3 ? 'checkout' : 'checkin',
      },
    });

    if (resp) {
      setTimeout(() => {
        getHistory();
      }, 1000);
    }

    setIsLoading(false);
  };

  return (
    <div className='App'>
      {!showOptions && (
        <>
          <h5>Talenta Clockin / Clockout</h5>

          <button onClick={onToggleOptions}>Setting</button>

          {config.authCookie !== '' && (
            <div id='content'>
              {profile?.full_name && (
                <strong>
                  <p id='greeting'>Halo {profile?.full_name}</p>
                  {config && (
                    <p>
                      {config.latitude},{config.longitude}
                    </p>
                  )}
                </strong>
              )}

              <p>Today {getTodayDateLong()}</p>

              <div id='list'>
                {history.length > 0 &&
                  history.map((h) => (
                    <p key={h.time}>
                      {h.type} - {h.time}
                    </p>
                  ))}
              </div>

              {attendanceStatus === 1 && (
                <>
                  <p>You haven&lsquo;t made attendance today</p>
                  <button onClick={() => onClock(2)} disabled={isLoading}>
                    {isLoading ? 'loading...' : 'Clockin'}
                  </button>
                </>
              )}
              {attendanceStatus === 2 && (
                <button onClick={() => onClock(3)} disabled={isLoading}>
                  {isLoading ? 'loading...' : 'Clockout'}
                </button>
              )}
            </div>
          )}

          {config.authCookie === '' && (
            <p>Settings not found, please update the setting</p>
          )}
        </>
      )}

      {showOptions && (
        <>
          <h5>Talenta Clockin / Clockout Setting</h5>

          <fieldset>
            <label>Token</label>
            <input
              type='text'
              value={optionsForm.authCookie}
              onChange={(event) => handleChange('authCookie', event)}
              name='token'
            />

            <label>Latitude</label>
            <input
              type='text'
              value={optionsForm.latitude}
              onChange={(event) => handleChange('latitude', event)}
              name='latitude'
            />

            <label>Longitude</label>
            <input
              type='text'
              value={optionsForm.longitude}
              onChange={(event) => handleChange('longitude', event)}
              name='longitude'
            />

            <button onClick={onSaveOption}>Save</button>
          </fieldset>
        </>
      )}
    </div>
  );
}

export default App;
